---
title: "Vue.js: Add component on click"
date: 2017-10-17T23:00:00+0800
tags: ["vue.js"]
---

I have been working on a project which uses `Vue.js` for front end. I came across a scenario where we need to allow user to add more entry in their form.

### Initial Approach

The first thought that come to my mind will be get the `div#id` of the element and `append` it dynamically through `javascript`

```javascript
var parent = document.getElementById("parent");
var component = createComponent(); // Assuming this return an Node element

parent.appendChild(component);
```

However, since we are using `Vue.js`, it doesn't feel natural to approach it this way.

### With Vue.js

Instead, we can utilize the functionality of `Vue.js`, by using `v-for` and `v-on:click`.

```html
<template>
  <div>
    <p v-for="index in count" :key="index">
      {% raw %}{{ index }}{% endraw %}
    </p>
    <button v-on:click="addComponent">Add</button>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        count: 1
      };
    },
    methods: {
      addComponent() {
        this.count += 1;
      }
    }
  };
</script>
```

1. Declare a counter

- We first declare a data `count` with the initial value of 1.

2. Use `v-for` to generate components

- In our `template` tag, We loop through the component with `v-for="index in count"`.
- With the `v-for` shorthands, `vue` will generate from `count` times of the component. In this case, `count` act like range. For more detailed explanation, refer to the official documetation: [v-for with a Range](https://vuejs.org/v2/guide/list.html#v-for-with-a-Range){:target="\_blank"}).

3. Button to increase `count`

- Then we create a `Add` button that execute `addComponent` on click. The `addComponent` method is fairly straightforward, just increase the `count` by 1.
- When the user click the `Add` button, the `count` will be increased by 1, thus cause `Vue.js` to render additional component in our view.

### Conclusion

With the combination of, `count` act as counter. `v-for` to generate the components, and `addComponent` method to increase the `count`, we are able to render new component into our view when the user click the button.

P.S. The solution is inspired by this [forum post](https://forum-archive.vuejs.org/topic/747/clone-component-when-click-add-more/3){:target="\_blank"}
