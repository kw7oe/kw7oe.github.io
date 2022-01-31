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

## Prerequisite

To build a web extension, all you need to know is some basic of:

- HTML & CSS _(you don't even need to know CSS for this example)_
- JavaScript

## Basic Structure of a web extension

Web extension, put it simply, is some HTML & CSS that run on the web
browser with some restrictions and permissions.


### Folder structure

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

### Interaction with other system

Most of the time, your web extension will interact with the [browser JavaScript APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API) to achieve something you want..

So simple architecture diagram of your web extension will look like this:

```
User <-> Your Web Extension <-> Browser APIs
```

## Our first web extension

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



### Initialize our project folder

Let's create our web extension code folder:

```bash
mkdir my-ttmd
cd my-ttmd
touch manifest.json index.js
```

### Writing our `manifest.json`

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

- `browser_action`
- `background`
- `permissions`
