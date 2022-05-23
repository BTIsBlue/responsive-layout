<template>
  <div ref="layout" class="responsive-layout" :style="layoutStyle">
    <responsive-item
      v-show="isResizing || isDragging"
      :rect="placeholder.rect"
      :x="placeholder.x"
      :y="placeholder.y"
      :w="placeholder.w"
      :h="placeholder.h"
      :i="placeholder.i"
    />
    <slot />
  </div>
</template>

<script>
import { bottom, compact, moveElement } from "./util";
import ResponsiveItem from "./ResponsiveItem";
// { x: 第X列, y: 第Y行, w: 占W列, h: 占H行 }
export default {
  name: "responsive-layout",
  components: {
    ResponsiveItem,
  },
  props: {
    layout: {
      type: Array,
      required: true,
    },
    colNum: {
      type: Number,
      default: 12,
    },
    rowHeight: {
      type: Number,
      default: 150,
    },
    margin: {
      type: Array,
      default: () => [10, 10],
    },
  },
  data() {
    return {
      isResizing: false,
      isDragging: false,
      activatedId: void 0,
      width: void 0,
      placeholder: {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        i: -1,
        rect: null,
      },
    };
  },
  computed: {
    layoutStyle({ layout, rowHeight, margin }) {
      return {
        height: `${bottom(layout) * (rowHeight + margin[1]) + margin[1]}px`,
      };
    },
  },
  provide() {
    return {
      eventBus: this,
      containerGetter: () => ({
        width: this.width,
        rowHeight: this.rowHeight,
        colNum: this.colNum,
        margin: this.margin,
      }),
      globalGetter: () => ({
        activatedId: this.activatedId,
      }),
    };
  },
  methods: {
    resizeEvent(eventName, id, rect, l) {
      const layoutItem = this.layout.find((l) => l.i === id);
      if (eventName !== "resizestart") {
        Object.assign(layoutItem, l);
      }

      if (eventName === "resizestart" || eventName === "resizemove") {
        this.placeholder.rect = rect;
        this.placeholder.i = "resizing-rect";
        this.$nextTick(() => {
          this.isResizing = true;
        });
      } else {
        this.$nextTick(() => {
          this.isResizing = false;
        });
      }
      const layout = moveElement(this.layout, l, l.x, l.y, true);
      compact(layout);

      if (eventName === "resizeend") {
        this.placeholder.rect = null;
        this.$emit("layout-updated", this.layout);
      }
    },
    dragEvent(eventName, id, x, y) {
      let layoutItem = this.layout.find((l) => l.i === id);

      if (eventName === "dragmove" || eventName === "dragstart") {
        this.placeholder.i = "dragging-rect";
        this.placeholder.x = layoutItem.x;
        this.placeholder.y = layoutItem.y;
        this.placeholder.w = layoutItem.w;
        this.placeholder.h = layoutItem.h;
        this.$nextTick(() => {
          this.isDragging = true;
        });
      } else {
        this.$nextTick(() => {
          this.isDragging = false;
        });
      }

      // Move the element to the dragged location.
      const layout = moveElement(this.layout, layoutItem, x, y, true);
      compact(layout);
      // needed because vue can't detect changes on array element properties
      if (eventName === "dragend") this.$emit("layout-updated", this.layout);
    },
  },
  mounted() {
    // 监听item的resize事件
    this.$on("resizeEvent", this.resizeEvent);
    // // 监听拖拽事件
    this.$on("dragEvent", this.dragEvent);
    // // 监听布局的宽度变化
    const resizeOb = new ResizeObserver(() => {
      this.width = this.$refs.layout.offsetWidth;
    });
    resizeOb.observe(this.$refs.layout);
    // // 销毁掉这些事件
    this.$once("hook:beforeDestroyed", () => {
      this.$off("resizeEvent", this.resizeEvent);
      this.$off("dragEvent", this.dragEvent);
      resizeOb.disconnect();
    });
    this.$on("clickEvent", (i) => {
      this.activatedId = i;
    });
    this.width = this.$refs.layout.offsetWidth;
    compact(this.layout);
  },
};
</script>

<style scoped lang="less">
.responsive-layout {
  position: relative;
  transition: height 150ms ease;
}
</style>
