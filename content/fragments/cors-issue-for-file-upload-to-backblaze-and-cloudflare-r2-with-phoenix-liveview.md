---
title: "CORS issue using Phoenix LiveView to direct upload to Backblaze or Cloudflare R2"
date: 2023-07-29T23:41:20+08:00
draft: true
tags: ["phoenix", "liveview"]
---

Phoenix LiveView has an amazing documentation on implementing direct upload to S3 in
the [official documentation][0]. It works well if you are using AWS S3. However, you might
want to use it with AWS S3 alternatives like Backblaze and Cloudflare R2 that is S3
API compatible.

When attempting to follow the guide above in the Phoenix LiveView documentation, you'll
quickly realize following the steps doesn't end up with a working solution. You'll face
some CORS issue.

Then, you update the CORS configuration in the cloud storage settings and expecting it work.

But it doesn't either.

### Problem

So, what went wrong?

It turns out that, most of the AWS S3 alternatives aren't completely S3 API compatible. While
they support most of the S3 API, there are always some caveats.

In our case, it's because the documentation implement direct upload to S3 through
the `POST` method with native HTML form to a presigned URL, which is currently not
supported in some of the AWS S3 alternatives like Cloudflare R2 and Backblaze.

For Cloudflare R2, the reasoning can be found under the ["Supported HTTP methods" section
of the Cloudflare R2 Presigned URLs][1] documentation:


> ...`POST`, which performs uploads via native HTML forms, is not currently supported.

For Backblaze, while the documentation doesn't point it out explicitly about this, it's actually mentioned
in one of the [ElixirForum dicussion about Backblaze and Phoenix LiveView Uploads][2]:

> ... B2 does not support POST for the S3 PutObject operation.

If we take a look at the S3 Put Object documentation for Backblaze [here][3], it doesn mentioned the
HTTP method supported is `PUT`:

> ...`PUT` https://s3.<your-region>.backblazeb2.com/:bucket/:key

To conclude, it doesn't work because, in the Phoenix LiveView official documentation,
it is using the `POST` method to upload the file directly to AWS S3, which isn't supported.

### Solution

To resolve the above issue, we have to:

- Generate the presigned URL with `PUT` method. In the documentation, it's generating a `POST` presigned URL underneath.
- Update the `Uploader` JavaScript implementation to make a `PUT` HTTP requests instead of `POST` with form.

Now, these information should be sufficient for you to resolve your bug. If not, you can refer the following
for code exmaples from ElixirForum:

- [Using file upload in Phoenix Liveview with Cloudflare R2](https://elixirforum.com/t/using-file-upload-in-phoenix-liveview-with-cloudflare-r2/56182/2)
- [Backblaze and Phoenix LiveView uploads](https://elixirforum.com/t/backblaze-and-phoenix-liveview-uploads/57153/20)

[0]: https://hexdocs.pm/phoenix_live_view/uploads-external.html
[1]: https://developers.cloudflare.com/r2/api/s3/presigned-urls/#supported-http-methods
[2]: https://elixirforum.com/t/backblaze-and-phoenix-liveview-uploads/57153/8
[3]: https://www.backblaze.com/apidocs/s3-put-object
