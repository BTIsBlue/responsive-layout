export function compact(layout) {
  // const reszingItem = layout.find((l) => l.resizing);
  const compareWith = [];
  let sorted = sortLayoutItemsByRowCol(layout);
  // 如果要挤下去则使用该方案
  // if (reszingItem) {
  //   const initSorted = sorted.filter((l) => !l.resizing);
  //   const collideItemIndex = initSorted.findLastIndex((l) =>
  //     collides(l, reszingItem)
  //   );
  //   if (~collideItemIndex) {
  //     initSorted.splice(collideItemIndex, 0, reszingItem);
  //     sorted = initSorted;
  //   }
  //   reszingItem.resizing = false;
  // }
  // Holding for new items.
  const out = Array(layout.length);

  sorted.forEach((l) => {
    l = compactItem(compareWith, l);

    // Add to comparison array. We only collide with items before this one.
    compareWith.push(l);

    // Add to output array to make sure they still come out in the right order.
    out[layout.indexOf(l)] = l;

    // Clear moved flag, if it exists.
    l.moved = false;
  });

  return out;
}

/**
 * Compact an item in the layout.
 */
export function compactItem(compareWith, l) {
  // Move the element up as far as it can go without colliding.
  while (l.y > 0 && !getFirstCollision(compareWith, l)) {
    l.y--;
  }

  // Move it down, and keep moving it down if it's colliding.
  let collides;
  while ((collides = getFirstCollision(compareWith, l))) {
    l.y = collides.y + collides.h;
  }
  return l;
}

export function sortLayoutItemsByRowCol(layout) {
  return layout.sort(function (a, b) {
    if (a.y === b.y && a.x === b.x) return 0;
    if (a.y > b.y || (a.y === b.y && a.x > b.x)) return 1;
    return -1;
  });
}

/**
 * Returns the first item this layout collides with.
 * It doesn't appear to matter which order we approach this from, although
 * perhaps that is the wrong thing to do.
 *
 * @param  {Object} layoutItem Layout item.
 * @return {Object|undefined}  A colliding layout item, or undefined.
 */
export function getFirstCollision(layout, layoutItem) {
  return layout.find((l) => collides(l, layoutItem));
}

export function getAllCollisions(layout, layoutItem) {
  return layout.filter((l) => collides(l, layoutItem));
}

/**
 * Given two layoutitems, check if they collide.
 *
 * @return {Boolean}   True if colliding.
 */
export function collides(l1, l2) {
  if (l1 === l2) return false; // same element
  if (l1.x + l1.w <= l2.x) return false; // l1 is left of l2
  if (l1.x >= l2.x + l2.w) return false; // l1 is right of l2
  if (l1.y + l1.h <= l2.y) return false; // l1 is above l2
  if (l1.y >= l2.y + l2.h) return false; // l1 is below l2
  return true; // boxes overlap
}

// 获取布局底部所在行数
export function bottom(layout) {
  return layout.reduce((max, item) => Math.max(item.y + item.h, max), 0);
}

export function moveElement(layout, l, x, y, isUserAction) {
  const movingUp = y && l.y > y;
  // This is quite a bit faster than extending the object
  if (typeof x === "number") l.x = x;
  if (typeof y === "number") l.y = y;
  l.moved = true;

  // If this collides with anything, move it.
  // When doing this comparison, we have to sort the items we compare with
  // to ensure, in the case of multiple collisions, that we're getting the
  // nearest collision.
  let sorted = sortLayoutItemsByRowCol(layout);
  if (movingUp) sorted = sorted.reverse();
  const collisions = getAllCollisions(sorted, l);

  // Move each item that collides away from this element.
  collisions.forEach((collision) => {
    if (collision.moved) return;

    // This makes it feel a bit more precise by waiting to swap for just a bit when moving up.
    if (l.y > collision.y && l.y - collision.y > collision.h / 4) return;

    layout = moveElementAwayFromCollision(layout, l, collision, isUserAction);
  });

  return layout;
}

/**
 * This is where the magic needs to happen - given a collision, move an element away from the collision.
 * We attempt to move it up if there's room, otherwise it goes below.
 *
 * @param  {Array} layout            Full layout to modify.
 * @param  {LayoutItem} collidesWith Layout item we're colliding with.
 * @param  {LayoutItem} itemToMove   Layout item we're moving.
 * @param  {Boolean} [isUserAction]  If true, designates that the item we're moving is being dragged/resized
 *                                   by the user.
 */
export function moveElementAwayFromCollision(
  layout,
  collidesWith,
  itemToMove,
  isUserAction
) {
  const preventCollision = false; // we're already colliding
  // If there is enough space above the collision to put this element, move it there.
  // We only do this on the main collision as this can get funky in cascades and cause
  // unwanted swapping behavior.
  if (isUserAction) {
    // Make a mock item so we don't modify the item here, only modify in moveElement.
    const fakeItem = {
      x: itemToMove.x,
      y: itemToMove.y,
      w: itemToMove.w,
      h: itemToMove.h,
      i: "-1",
    };
    fakeItem.y = Math.max(collidesWith.y - itemToMove.h, 0);
    if (!getFirstCollision(layout, fakeItem)) {
      return moveElement(
        layout,
        itemToMove,
        undefined,
        fakeItem.y,
        preventCollision
      );
    }
  }

  // Previously this was optimized to move below the collision directly, but this can cause problems
  // with cascading moves, as an item may actually leapflog a collision and cause a reversal in order.
  return moveElement(
    layout,
    itemToMove,
    undefined,
    itemToMove.y + 1,
    preventCollision
  );
}
