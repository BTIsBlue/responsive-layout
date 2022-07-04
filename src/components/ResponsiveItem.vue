<template>
  <div
    ref="item"
    class="responsive-item"
    :class="itemClass"
    :style="itemStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousedown="handleClickItem"
  >
    <slot></slot>
    <template v-if="(isActivated || isHover) && !dragging">
      <div
        class="resize-handle"
        :key="dir.event"
        :style="{ ...dir.style, cursor: dir.event }"
        v-for="dir in resizeDirs"
      ></div>
    </template>
  </div>
</template>

<script>
import "@interactjs/auto-start";
import "@interactjs/actions/drag";
import "@interactjs/actions/resize";
import interact from "@interactjs/interact";
const resizeDirs = [
  {
    event: "nw-resize",
    style: { left: "-3px", top: "-3px" },
  },
  {
    event: "n-resize",
    style: { left: `calc(50% - 3px)`, top: "-3px" },
  },
  {
    event: "ne-resize",
    style: { right: "-3px", top: "-3px" },
  },
  {
    event: "e-resize",
    style: { right: "-3px", top: `calc(50% - 3px)` },
  },
  {
    event: "se-resize",
    style: { right: "-3px", bottom: "-3px" },
  },
  {
    event: "s-resize",
    style: { left: `calc(50% - 3px)`, bottom: "-3px" },
  },
  {
    event: "sw-resize",
    style: { left: "-3px", bottom: "-3px" },
  },
  {
    event: "w-resize",
    style: { left: "-3px", top: `calc(50% - 3px)` },
  },
];
export default {
  name: "responsive-item",
  props: {
    minH: {
      type: Number,
      required: false,
      default: 1,
    },
    minW: {
      type: Number,
      required: false,
      default: 1,
    },
    maxH: {
      type: Number,
      required: false,
      default: Infinity,
    },
    maxW: {
      type: Number,
      required: false,
      default: Infinity,
    },
    x: Number,
    y: Number,
    w: Number,
    h: Number,
    i: {
      required: true,
    },
    rect: Object,
  },
  inject: ["containerGetter", "globalGetter", "eventBus"],
  data() {
    return {
      resizeDirs: Object.freeze(resizeDirs),
      dragging: null,
      isHover: false,
    };
  },
  computed: {
    container({ containerGetter }) {
      return containerGetter();
    },
    global({ globalGetter }) {
      return globalGetter();
    },
    isActivated({ global, i }) {
      return global.activatedId === i;
    },
    containerWidth({ container }) {
      return container.width;
    },
    colNum({ container }) {
      return container.colNum;
    },
    rowHeight({ container }) {
      return container.rowHeight;
    },
    margin({ container }) {
      return container.margin;
    },
    colWidth({ containerWidth, margin, colNum }) {
      return (containerWidth - margin[0] * (colNum + 1)) / colNum;
    },
    innerLayout({ x, y, w, h, colNum }) {
      const [innerX, innerW] =
        x + w > colNum ? [0, w > colNum ? colNum : w] : [x, w];
      return { x: innerX, y: y, w: innerW, h: h };
    },
    itemStyle({ innerLayout, rect, dragging }) {
      const { x, y, w, h } = innerLayout;
      let { width, height, left, top } = rect
        ? rect
        : this.calcPosition(x, y, w, h);
      if (dragging) {
        top = dragging.top;
        left = dragging.left;
      }

      const translate = `translate3d(${left}px, ${top}px, 0)`;
      return {
        transform: translate,
        WebkitTransform: translate,
        MozTransform: translate,
        msTransform: translate,
        OTransform: translate,
        width: `${width}px`,
        height: `${height}px`,
      };
    },
    itemClass({ isActivated, isHover, dragging, rect, i }) {
      return {
        "responsive-item--hover": !dragging && !isActivated && !rect && isHover,
        "responsive-item--activated": !dragging && isActivated,
        "responsive-item--animation": !dragging && !rect,
        "responsive-item--dragging": dragging,
        "responsive-item__placeholder": [
          "resizing-rect",
          "dragging-rect",
        ].includes(i),
        "responsive-item__placeholder--resizing": rect,
      };
    },
  },
  methods: {
    handleMouseEnter() {
      this.isHover = true;
    },
    handleMouseLeave() {
      this.isHover = false;
    },
    handleClickItem() {
      this.eventBus.$emit("clickEvent", this.i);
    },
    initResizeEvent() {
      const maximum = this.calcPosition(0, 0, this.maxW, this.maxH);
      const minimum = this.calcPosition(0, 0, this.minW, this.minH);

      const opts = {
        edges: {
          left: true,
          right: true,
          bottom: true,
          top: true,
        },
        restrictSize: {
          min: {
            height: minimum.height,
            width: minimum.width,
          },
          max: {
            height: maximum.height,
            width: maximum.width,
          },
        },
      };

      this.interactObj.resizable(opts);
      this.interactObj.on(
        "resizestart resizemove resizeend",
        this.handleResize.bind(this)
      );
    },
    handleResize(event) {
      const newSize = { width: 0, height: 0, left: 0, top: 0 };

      ({
        resizestart: this.handleResizeStart,
        resizemove: this.handleResizeMove,
        resizeend: this.handleResizeEnd,
      }[event.type](event, newSize));
      // Get new WH
      const pos = this.calcItemLayout(newSize);
      pos.w = Math.min(Math.max(this.minW, pos.w, 1), this.maxW);
      pos.h = Math.min(Math.max(this.minH, pos.h, 1), this.maxH);

      this.eventBus.$emit("resizeEvent", event.type, this.i, newSize, pos);
    },
    handleResizeStart(event, newSize) {
      const { x, y, w, h } = this.innerLayout;
      const { width, height, left, top } = this.calcPosition(x, y, w, h);
      newSize.width = width;
      newSize.height = height;
      this.initSize = {
        width,
        height,
        left,
        top,
      };
    },
    handleResizeMove(event, newSize) {
      const {
        width: initWidth,
        height: initHeight,
        left: initLeft,
        top: initTop,
      } = this.initSize;
      const { left, top } = event.edges;
      newSize.left = initLeft - (left ? event.rect.width - initWidth : 0);
      newSize.top = initTop - (top ? event.rect.height - initHeight : 0);
      newSize.width = event.rect.width;
      newSize.height = event.rect.height;
    },
    handleResizeEnd(event, newSize) {
      const { x, y, w, h } = this.innerLayout;
      const { width, height, left, top } = this.calcPosition(x, y, w, h);
      newSize.width = width;
      newSize.height = height;
      newSize.left = left;
      newSize.top = top;
    },
    calcItemLayout({ height, width, left, top }) {
      let w = Math.round(
        (width + this.margin[0]) / (this.colWidth + this.margin[0])
      );
      let h = Math.round(
        (height + this.margin[1]) / (this.rowHeight + this.margin[1])
      );
      let x = Math.round(
        (left - this.margin[0]) / (this.colWidth + this.margin[0])
      );
      let y = Math.round(
        (top - this.margin[1]) / (this.rowHeight + this.margin[1])
      );
      // Capping
      w = Math.max(Math.min(w, this.colNum - this.innerLayout.x), 1);
      h = Math.max(h, 1);
      x = Math.max(Math.min(x, this.colNum - this.innerLayout.w), 0);
      y = Math.max(y, 0);
      return { x, y, w, h };
    },
    initDragEvent() {
      this.interactObj.draggable({});
      this.interactObj.on(
        "dragstart dragmove dragend",
        this.handleDrag.bind(this)
      );
    },
    handleDrag(event) {
      let newPosition = { top: 0, left: 0 };
      ({
        dragstart: this.handleDragStart,
        dragmove: this.handleDragMove,
        dragend: this.handleDragEnd,
      }[event.type](event, newPosition));

      let pos = this.calcItemLayout(newPosition);
      this.eventBus.$emit("dragEvent", event.type, this.i, pos.x, pos.y);
    },
    handleDragStart(event, newPosition) {
      const { x, y, w, h } = this.innerLayout;
      const { left, top } = this.calcPosition(x, y, w, h);
      newPosition.left = left;
      newPosition.top = top;
      this.dragging = newPosition;
    },
    handleDragMove(event, newPosition) {
      newPosition.left = this.dragging.left + event.dx;
      newPosition.top = this.dragging.top + event.dy;
      this.dragging = newPosition;
    },
    handleDragEnd(event, newPosition) {
      if (!this.dragging) return;
      const { x, y, w, h } = this.innerLayout;
      const { left, top } = this.calcPosition(x, y, w, h);
      newPosition.left = left;
      newPosition.top = top;
      this.dragging = null;
    },
    calcPosition(x, y, w, h) {
      return {
        left: Math.round(this.colWidth * x + (x + 1) * this.margin[0]),
        top: Math.round(this.rowHeight * y + (y + 1) * this.margin[1]),
        width:
          w === Infinity
            ? w
            : this.colWidth * w + Math.max(0, w - 1) * this.margin[0],
        height:
          h === Infinity
            ? h
            : Math.round(
                this.rowHeight * h + Math.max(0, h - 1) * this.margin[1]
              ),
      };
    },
  },
  mounted() {
    this.interactObj = interact(this.$refs.item);
    this.initResizeEvent();
    this.initDragEvent();
    this.$once("hook:beforeDestroy", () => {
      this.interactObj.unset();
    });
  },
};
</script>

<style scoped lang="less">
.responsive-item {
  position: absolute;
  box-sizing: border-box;
  background-color: lightgrey;
  border: 1px solid transparent;

  @operateColor: blue;

  &--animation {
    transition: all 150ms linear;
  }

  &--hover {
    border-style: dashed;
    border-color: @operateColor;
  }

  &--activated {
    border-color: @operateColor;
  }

  &--dragging {
    z-index: 2;
  }

  &__placeholder {
    background-color: @operateColor;
    opacity: 0.4;
    &--resizing {
      z-index: 2;
    }
  }
}

.resize-handle {
  position: absolute;
  width: 4px;
  height: 4px;
  border: 1px solid blue;
  background-color: white;
}
</style>
