---
title: "Writing a simple Firefox Extension"
date: 2022-01-31T19:51:11+08:00
draft: true
tags: ['javascript', 'web-extension', 'firefox']
---

Every now and then, I'm always trying to build something that I would use.
Coming from a web developer background, I'm always under the impression that I
have to build a web application.

While building web application is fun and challenging at first, it get boring
overtime, not to mentioned it involves more efforts _(both financially
and time)_.

I'm not sure how, one day I have this "a ha" moment where I feel building
web browser extension should always be your first choice if you want to build
something for the web.

It really depends on your use cases, but I would say if
a web extension is a viable option, it should be the first choice?
Assuming you are not creating a web extension that require interaction
with a backend service or store data in the cloud, here's some of the benefits
building a web extension over a web application:

- No hosting fees. It will be running on the web browser.
- Your user data is owned by them.
- You have access to a tons of amazing web browser APIs.

Through this post, you'll get more understanding on the anatomy of a Firefox
web extension and by the end of the post you'll have write a simple one.

# Prerequisite

To build a web extension, all you need to know is some basic of:

- HTML & CSS _(you don't even need to know CSS for this example)_
- JavaScript

# Basic Structure of a web extension

Web extension, put it simply, is some HTML & CSS that run on the web
browser with some restrictions and permissions.


## Folder structure

The most basic web extension folder structure will looks something like this:

```
├── index.js
├── index.html (Optional)
├── icons
│   └── icon.png
└── manifest.json
```

According to [Mozilla browser extension documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension),
`manifest.json` is the most important one to have:

> This is the only file that must be present in every extension. It contains basic metadata such as its name, version, and the permissions it requires. It also provides pointers to other files in the extension.

The others common things you will have is:

- `index.js`, your JavaScript file that contain the implementation of your web
extension.
- `index.html`, if your web extension happen to use a different page/tab in the
browser, this HTML file will represent the UI of the page.
- `icons/icon.png`, to allow the Web browser to display your extension icon.

## Interaction with other system

Most of the time, your web extension will interact with the [browser JavaScript APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API) to achieve something you want..

So simple architecture diagram of your web extension will look like this:

```
User <-> Your Web Extension <-> Browser APIs
```

# Our first web extension

As someone who use Markdown for note taking, and save links I
browsed day to day, I often find myself having to copy the title and the URL of
a web page, and manually note it down in my Markdown file.

After doing it again and again, I think that's the end of it, let me build a
web extension to do just that. So, the first web extension we are going to
build to day is `ttmd` _(short for title to markdown, what a creative name)_.

> It converts the current active tab (web page) into
Markdown format link and copy to user clipboard.

So, for example if by using our web extension now, it should copy the following
to our clipboard:

```
[Writing a simple Firefox Extension | kw7oe](http://localhost:1313/posts/2022/01/31/writing-a-simple-firefox-extension/)
```

_(is in localhost:1313 because this is written in my local environment)_

# Setting up our web extension

## Initialize our project folder

Let's create our web extension code folder:

```bash
mkdir my-ttmd
cd my-ttmd
touch manifest.json index.js
```

## Writing our `manifest.json`

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

The first few keys is self explanatory. So let's talk about the following keys
and what each means:

- `browser_action`, to specify button attached to the Firefox toolbar.
- `background`, to specify your backgroud scripts, which is needed when we need
to maintain long term state or long term operation independently of the
lifetime of our browser tab.
- `permissions`, to specify permissions we need to request from the user to use
our browser extension. For more, you can read about it [here][0].

For now, we are only requesting to access the [`tabs`][1] API, we will be requesting
for more permissions down the road as we progress.

## Writing our `index.js`

Since we state in the manifest that we will have a background script called
`index.js`, let's start writing some simple code:

In `index.js`:
```js
console.log("hello world")
```

Voila, our first extension is done. Classic hello world example. But how can we
use it?

## Testing our browser extension (without publishing)

As stated in [Mozilla tutorials][2], you can load your extension by:

1. Visit to `about:debugging` in Firefox.
2. Click `This Firefox`.
3. Click `Load Temporary Add-on`.
4. Choose your browser extension `manifest.json`.

And voila, you could see your browser extension icon by now.

Now click our extension toolbar button and nothing will happen. Upon inspecting
our console, you'll not see your `hello world` as well. So, how do we see our
console log for our browser extension? Well, similar to above:

1. Visit to `about:debugging` and click `This Firefox`.
2. Click `Inspect` of your extension.

Now you should be able to see your hello world logged!

Given that we have gone through how to setup your first web extension project,
write code and test the extension, we can now jump into the actual
implementation.


# Implementation walkthrough

Before we write our code, let's briefly talk about how we expect our browser
extension to behave:

>  When we click the toolbar button, it should copy the current active tab
title and url as Markdown format into our clipboard.

Sound simple enough, but it consists four parts:

1. Trigger an action when our toolbar button is clicked.
2. Get the current tab title and URL.
3. Format the title and URL into Markdown format.
4. Copy the Markdown format result to the user clipboard.

Out of the four steps, all of them have some unknowns, except for the third
step _(which is just a simple string manapulation)_.

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
- [Working with the Tabs API - Mozilla | MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API)
- [Interact with the clipboard - Mozilla | MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard)

Go have a read and come back. By then, you should have enough information
to write our first browser extension.

## Execute code when toolbar button is clicked

From the first article, we learn that we can use `browser.browserAction.onClicked.addListener(<function>)` to
execute code when our button is clicked.

So let's start writing our actual implementation:

In `index.js`:

```js
const titleToMarkdown = () => {
  console.log("hello world")
}

browser.browserAction.onClicked.addListener(titleToMarkdown);
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



[0]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions
[1]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs
[2]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#testing_it_out
