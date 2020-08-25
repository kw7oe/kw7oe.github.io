---
title: "Getting Started With Github Actions"
date: 2020-08-25T21:56:37+08:00
draft: true
---

For the past few months, I have been experimenting with GitHub Actions as Naluri
CI/CD pipeline provider. The goal is to setup a deployment pipeline which
automate the following:

- Run tests on every commits.
- Build Docker image and push to Docker Registry _(Amazon ECR in our case)_
  based on commit message.
- Deploy the image to staging environment automatically based on commit
  message.

At the time of writing, we choose to trigger certain actions based on commit
message for the ease of experimentation. Ideally, we are thinking about using
git tag to trigger a build and deploy process.

So, in this post, you can expect to learn how to use GitHub Actions to achieve
the following:

- Run tests.
- Build Docker Image.
- Push Docker Image to Registry.


Here are some of the tips and tricks that I have learnt while implementing the
workflow in Github Actions:

- Running workflows on Self Hosted runner.
- Running jobs on git action (E.g. push, PR, tag and etc).
- Running jobs based on commit message.
- Run multiple jobs sequentially, where job B depends on job A.
- Setting runtime variables in GitHub workflow.
- Managing secrets in GitHub workflow.
- Debugging your workflow.


[0]: https://github.community/t/add-short-sha-to-github-context/16418/6
[1]: https://github.community/t/run-next-job-sequentially-even-if-a-previous-job-fails/17404/2
[2]: https://stackoverflow.com/questions/57968497/how-do-i-set-an-env-var-with-a-bash-expression-in-github-actions
[3]: https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions
[4]: https://stackoverflow.com/questions/59759921/how-to-skip-github-actions-job-on-push-event
[5]: https://docs.github.com/en/actions/reference/workflow-commands-for-github-actions
[6]: https://github.com/actions/starter-workflows/issues/68
[7]: https://github.community/t/how-can-i-set-an-expression-as-an-environment-variable-at-workflow-level/16516/6#M4751
