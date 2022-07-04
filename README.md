# responsive-layout
基于vue-grid-layout的自适应可拖拽变形布局<br/>
1、可以往八个方向进行变形<br/>
2、调整了变形过程中的展示，可以更加直观地知道变形后的布局
3、修复了vue-grid-layout出现滚动条时会导致溢出的BUG
# Usage
```html
    <responsive-layout :layout.sync="layout" :col-num="12" :row-height="30">
      <responsive-item
        v-for="item in layout"
        :key="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :i="item.i"
      >
        <span class="text">
          {{ item.i }}
        </span>
      </responsive-item>
    </responsive-layout>
```
