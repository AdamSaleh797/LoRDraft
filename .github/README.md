# Legends of Runeterra Draft

The unofficial drafting website for the card game [Legends of
Runeterra](https://playruneterra.com/).

## Installation & Configuration

To get started, you'll first need to download these prerequisites:

1. [VS Code](https://code.visualstudio.com/)
1. NodeJS/NPM
   - MacOS: I recommend using [Homebrew](https://brew.sh/) and installing with
     `brew install node`
   - Windows: Download directly from the [NodeJS
     website](https://nodejs.org/en/download/)

## Configuring VS Code

All you need to configure VS Code are the following extensions:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier - Code
  formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Rewrap](https://marketplace.visualstudio.com/items?itemName=stkb.rewrap)
- [CSS
  Formatter](https://marketplace.visualstudio.com/items?itemName=aeschli.vscode-css-formatter)

We also highly recommend turning on format-on-save and enabling Prettier as the
default formatter for TypeScript files.

## Contributing

Once you have a set of changes you'd like to commit, first publish them to a new
branch. If you are not a contributor for the repository, first make a fork and
push your changes to a branch of the forked repository. From there, open a pull
request into the `main` branch. Either @ClaytonKnittel or @AdamSaleh797 will be
automatically requested as reviewers, depending on which files were changed.

Before merging, all of the GitHub actions must pass, and you need an approval
from a reviewer. We always prefer squash-merging, so be sure to select that
before merging your changes.
