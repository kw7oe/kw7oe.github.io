---
title: "Writing a simple Firefox Extension"
date: 2022-02-12T20:30:11+08:00
tags: ['javascript', 'web-extension', 'firefox', 'tutorial']
---

Every now and then, I want to build something that I would use.
Coming from a web developer background, I'm under the impression that I
have to build a web application.

One day I have this _"a ha"_ moment:

> Actually most of the time, I can just build a web extension instead of a
web application for my needs!

Assuming that you are not creating a web extension that require backend,
here's some of the benefits building a web extension over a web application:

- No hosting fees. It will be running on the web browser.
- Your user data is owned by them. No need to deal with GDPR?
- You have access to a tons of amazing web browser APIs.

Through this post, you'll get more understanding on the anatomy of a Firefox
web extension. By the end of it, you'll write a simple one.

<div class="callout callout-info">
  <h3 style="margin-top: 0;">Prerequisite</h3>
  <p>To build a web extension, all you need to know is the basic of:</p>
  <ul>
  <li>JavaScript</li>
  <li>HTML & CSS <em>(optional, you don't need both for this post)</em></li>
  </ul>
</div>


Here's how this post will be structured:

- [Basic structure of web extension](#basic-structure-of-web-extension)
  - [Project structure](#project-structure)
  - [High level architecture](#high-level-architecture)
- [Our first web extension](#our-first-web-extension) - _Be sure to read this before to jump into any of the below
  so that you have enough context._
- [Setting up web extension](#setting-up-web-extension)
  - [Initialize project folder](#initialize-project-folder)
  - [Writing `manifest.json`](#writing-manifestjson)
  - [Writing `index.js`](#writing-indexjs)
  - [Testing browser extension](#testing-browser-extension)
- [Actual implementation](#actual-implementation)
- [Practice](#practice)
- [Closing](#closing)




# Basic structure of web extension

Web extension is HTML, CSS and JavaScript that run on the web
browser with some restrictions and permissions.

Before writing any new kind of project, is always good to know the
project structure and how it works at a high level.


## Project structure

The most basic web extension project structure will looks something like this:

```
├── index.js
├── index.html (Optional)
├── icons
│   └── icon.png
└── manifest.json
```

According to [Mozilla browser extension documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension),
`manifest.json` is the only one you need:

> This is the only file that must be present in every extension. It contains basic metadata such as its name, version, and the permissions it requires. It also provides pointers to other files in the extension.

The others common files you will have are:

- `index.js`, your JavaScript file that contains the implementation of your web
extension.
- `index.html`, if your web extension happens to use a pop-up/page/tab in the
browser, this HTML file will represents the UI of the page.
- `icons/icon.png`, to allow the web browser to display your extension icon.

## High level architecture

Most of the time, your web extension will interact with the [browser JavaScript APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API) to achieve something you want.

Here's the high level architecture of web extension:

```
User <-> Your Web Extension <-> Browser APIs
```

_(this is not entirely accurate)_

# Our first web extension

As someone who uses Markdown for note taking and saves links I
browsed day to day, I often find myself copy the title and the URL of
a web page and note it down to my Markdown file.

After doing it again and again, I think I should build a
web extension to do that. This is the web extension we are
building today: `ttmd` _(short for title to markdown, what a creative name)_.

> It converts the current active tab (web page) into
Markdown link and copy it to user clipboard.

For example, by using our web extension now, it should copy the following
to our clipboard:

```
[Writing a simple Firefox Extension | kw7oe](http://localhost:1313/posts/2022/01/31/writing-a-simple-firefox-extension/)
```

_(is in localhost:1313 because this is written in my local environment)_

# Setting up web extension

## Initialize project folder

Let's create our web extension project folder:

```bash
mkdir my-ttmd
cd my-ttmd
touch manifest.json index.js
```

## Writing `manifest.json`

In `manifest.json`, add the following code:

```json
{
  "manifest_version": 2,
  "name": "my-ttmd",
  "description": "Title to Markdown",
  "version": "0.0.1",
  "browser_action": {
    "default_icon": {},
    "default_title": "Title to Markdown!"
  },
  "background": {
    "scripts": ["index.js"]
  },
  "permissions": ["tabs"]
}
```

The first few keys are self explanatory. I'll skip those and explain
the following keys only:

- `browser_action`, to specify button attached to the Firefox toolbar.
- `background`, to specify your backgroud scripts, which is where we write
our code mainly.
- `permissions`, to specify permissions we need to request from the user to use
our browser extension. For more, you can read about it [here][0].

Currently, we requested permissions for the [`tabs`][1] API. We will be
requesting for more permissions as we needed.

## Writing `index.js`

Since we state in the manifest that we will have a background script called
`index.js`, let's start writing some simple code:

In `index.js`:
```js
console.log("hello world")
```

Voila, our first extension is done. Classic hello world example. But how can we
test it?

## Testing browser extension

As stated in [Mozilla tutorials][2], you can test your extension by temporarily
loading your extension. Here's the steps:

1. Visit to `about:debugging` in Firefox.
2. Click `This Firefox`.
3. Click `Load Temporary Add-on`.
4. Choose your browser extension `manifest.json`.

After that, you should see your browser extension icon in the toolbar.

Now click our extension toolbar button and nothing will happen. Upon inspecting
our console, you'll not see your `hello world` as well.

So, how do we see our console log for our browser extension?
Well, similar to above:

1. Visit to `about:debugging` and click `This Firefox`.
2. Click `Inspect` of your extension.

Now you should be able to see your hello world logged!

Given that we have gone through how to setup your first web extension project,
write code and test the extension, we can now jump into the actual
implementation.


# Actual implementation

Let's first describe in detail the behaviour of our browser extension
before we jump into the implementation:

>  When we click the toolbar button, it should copy the current active tab
title and URL as Markdown link into our clipboard.

Then, we can break it down further into four parts:

1. Trigger an action when our toolbar button is clicked.
2. Get the current tab title and URL.
3. Format the title and URL into Markdown format.
4. Copy the Markdown format result to the user clipboard.

Out of the four steps, all of them have some unknowns, except for the third
step _(which is just a simple string manipulation)_.

Given that, all we have to do is figure out:

- How to execute some code when our browser extension toolbar button is
clicked in Firefox?
- How to get the browser current active tab information such as title and URL
in Firefox?
- How to copy some string to user clipboard in browser in Firefox?

If you're up to some challenge, you can stop reading this article and proceed
to find out the answer yourself.

Else, here's some the first few results I got from Google Search the
questions above directly:

- [Add a button to the toolbar - Mozilla | MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Add_a_button_to_the_toolbar)
- [Working with the Tabs API - Mozilla | MDN][3]
- [Interact with the clipboard - Mozilla | MDN][5]

Go have a read and come back. By then, you should have enough information
to write our first browser extension.

## Execute code when toolbar button is clicked

From the first article, we learn that we can use `browser.browserAction.onClicked.addListener(<function>)` to
execute code when our button is clicked.

So let's start writing our actual implementation:

In `index.js`:

```diff
- console.log("hello world")
+ const titleToMarkdown = () => {
+  console.log("hello world")
+ }

+ browser.browserAction.onClicked.addListener(titleToMarkdown);
```

Nothing hard and fancy here, we extract our `console.log` into the
`titleToMarkdown` function, and register our function with the browser action
listener using the provided API.

Now let's test it out whether it works as expected. Visit to `about:debugging`
again and click `This Firefox`, under your browser extension click the `Reload`
button.

Now you can click `Inspect` button again and play around with your browser
extension
toolbar button. You should see hello world being logged multiple time.

## Get the browser current active tab information

By reading through the documentation about [working with the Tabs API][3], we know that
we could use `browser.tabs.query({...})` to get information about user tabs in
browser.

However, since the documentation only mentioned about getting the current
window active tabs by listing all the current window tabs and looping through
each of it to find out which is active, let's see if there's a simpler way by
looking at the API references of [`tabs.query`][4].

Indeed there is, we can pass in `active: true` to get the current active tabs
and `currentWindow: true` to get the active tab of our current window.

The reason, we need to specify current window is because, a user might have
multiple Firefox application open, but we are only interested in the current
one they are looking at.

So, here's how the code would look like in `index.js`:

```diff
const titleToMarkdown = async () => {
- console.log("hello world");
+ let tabs = await browser.tabs.query({
+   active: true,
+   currentWindow: true,
+ });

+ console.log({ tabs });
};

browser.browserAction.onClicked.addListener(titleToMarkdown);
```

Now, reload our browser extension and play around with it and we will
be able to see the information we get.

Here's what I get:

```js
{
  "tabs": [
    {
      "id": 326,
      // other key value pairs ...
      "url": "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/query",
      "title": "tabs.query() - Mozilla | MDN"
    }
  ]
}
```

## Format it to Markdown

Well, for formatting is pretty straighforwad.

```diff
const titleToMarkdown = async () => {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

+ let result = `[${tabs[0].title}](${tabs[0].url})`;

- console.log({ tabs });
+ console.log({ result });
};

browser.browserAction.onClicked.addListener(titleToMarkdown);
```

## Copy to clipboard

Given the information we have from [here][5], it should be straighforwad for us
as well. Is all about calling the right API.

Let's first add `clipboardWrite` to our `permissions` in `manifest.json` as
mentioned in the documentation:

> Using the API requires the permission "clipboardRead" or "clipboardWrite" in your manifest.json file

In `manifest.json`:
```diff
-  "permissions": ["tabs"]
+  "permissions": ["tabs", "clipboardWrite"]
```

Then all we have to do is called `navigator.clipboard.writeText` in `index.js`:

```diff
const titleToMarkdown = async () => {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  let result = `[${tabs[0].title}](${tabs[0].url})`;

+ navigator.clipboard.writeText(result).then(
+   function () {
+     console.log("successfully copied to clipboard!");
+   },
+   function () {
+     console.log("failed copied to clipboard!");
+   }
+ );

- console.log({ result });
};

browser.browserAction.onClicked.addListener(titleToMarkdown);
```

Be sure to reload your browser extension again every time you make the changes.
Now by clicking our toolbar button, we should able to successfully copy the
current active tab as Markdown link.

🎉 In just 19 lines of code, we write our first web extension.

# Practice

_But something is lacking right? It's not obvious for our user to know if
the Markdown link is successfully copied._

Now it's your turn to implement that!

---

_Purposely left blank for those who want to implement the notification
part without any spoilers or hint_

...

...

...

...

...

---

# My solution

Similar with the approach I took above, this is what I would Google search:

- [how to alert in firefox browser extension - Google Search](https://www.google.com/search?client=firefox-b-d&q=how+to+alert+in+firefox+browser+extension)

Your result may vary but the second result of it is what I'm looking for:

- [notifications.create() - Mozilla | MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications/create)

Given this information, if you haven't implement it your own as a practice,
this is your last resort before I show my final code.

---

_Last resort to implement it for anyone who's interested to_

...

...

...

...

...

---

So, here's how my final code looks like:

In `manifest.json`:
```diff
- "permissions": ["tabs", "clipboardWrite"]
+ "permissions": ["tabs", "notifications", "clipboardWrite"]
```

In `index.js`:
```diff
const titleToMarkdown = async () => {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  let result = `[${tabs[0].title}](${tabs[0].url})`;

  navigator.clipboard.writeText(result).then(
+   async function () {
+     await browser.notifications.create({
+       type: "basic",
+       title: "🎉 Sucess!",
+       message:
+         " Successfully copy the title and URL for this page to your clipboard!",
+     });

      console.log("successfully copied to clipboard!");
    },
    function () {
      console.log("failed copied to clipboard!");
    }
  );
};

browser.browserAction.onClicked.addListener(titleToMarkdown);
```

That's all we have for today. If you implemented yourself, you might have
a different implementation and that's okay. There's no right and wrong as
long as we achieve our goal of notifiying the user.

# Closing

If you need the full code example, here's the [repository][6] to my implementation.
It might have slight differences but majority of it should be the same.

Hopefully, this open up the path to you all to the world of developing browser
extension. It is always good to add another tool to your tool kit.

Anyway, the key takeaways shouldn't be just the code we have written, but **the
approach we took to figure out the unknowns.**

[0]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions
[1]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs
[2]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#testing_it_out
[3]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API
[4]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/query
[5]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard
[6]: https://github.com/kw7oe/ttmd/tree/main
