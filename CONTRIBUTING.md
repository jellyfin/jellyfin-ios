# Contributing to Jellyfin for iOS

Thanks for taking the time to contribute! :purple_heart:
Jellyfin is an entirely volunteer-driven project, so without contributors like you it could not exist!

Below are some general guidelines and information about this project.
If you have any questions, please join one of our [development chat rooms](https://jellyfin.org/contact) to discuss them!

## Contributor Guidelines

### New Code

* New files **MUST** be written in TypeScript.
* API interactions **MUST** be made using the Jellyfin TypeScript SDK.
* **SHOULD** be covered by unit tests when possible.
* **SHOULD** avoid whitespace only changes in unchanged sections of code.
* All files **MUST** include the following MPL-2.0 license header (with `YYYY` replaced with the year that the code was written):
  ```
  /**
   * Copyright (c) YYYY Jellyfin Contributors
   *
   * This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this
   * file, You can obtain one at https://mozilla.org/MPL/2.0/.
   */
  ```

### Localization

* Translation changes or additions **MUST** be made via the [Jellyfin Weblate instance](https://translate.jellyfin.org/) except for the source language (`en`).
* Existing translation keys **SHOULD NOT** be renamed without a significant reason. Weblate cannot track key name changes so a key name change requires retranslation in ALL languages.

### Pull Requests

* **MUST** follow [project guidelines](https://jellyfin.org/docs/general/contributing/development#pull-request-guidelines).
  * **SHOULD NOT** use "Conventional Commits" for titles or commit messages.
  * **SHOULD NOT** rebase once reviews are in progress.
* **MUST** follow the [LLM development policy](https://jellyfin.org/docs/general/contributing/llm-policies).
* **MUST** test that the change works as expected before marking a PR as ready for review.
* **SHOULD** represent a singular focus (i.e. a PR to fix a bug should not include unrelated refactoring).
* **SHOULD NOT** update from `master` needlessly once opened (only update if conflicts exist).

## Application Architecture

### Tech Stack

* [Expo](https://docs.expo.dev/) &mdash; Mobile development framework
* [TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html) &mdash; Programming language
* [React Navigation](https://reactnavigation.org/docs/getting-started) &mdash; Navigation library
* [React Native Elements](https://reactnativeelements.com/docs) &mdash; UI component library
* [Zustand](https://zustand.docs.pmnd.rs/learn/getting-started/introduction) &mdash; State management library
* [Jest](https://jestjs.io/docs/getting-started) &mdash; Test library

## Directory Structure

```sh
.
├── assets        # Static assets
│   └── js        # JavaScript files that are injected into the webview
├── components    # React UI components
├── constants     # Constants used throughout the application
├── fastlane      # Fastlane scripts for building and releasing the app
├── features      # Feature-specific code
│   └── downloads # All code related to the downloads feature
├── hooks         # Custom React hooks
├── ios           # Expo prebuild for iOS
├── langs         # Translation files (only commit changes to en.json)
├── models        # Data models
├── navigation    # React Navigation navigators
├── patches       # Patch files to fix React Native issues
├── screens       # React screen components
├── scripts       # Maintenance scripts
├── stores        # Data stores
├── themes        # Combined React Navigation and React Native Elements themes
├── types         # TypeScript types
└── utils         # Utility functions
```
