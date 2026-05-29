---
stoplight-id: 4xnxhzxf2sfpx
---

# Build the web app

## Introduction

This tutorial shows you how use npm to build your web app from a previous tutorial.

## Prerequisites

- Tutorial - [Implement the echo functionality](8-implement-echo.md)

## Steps

1. Open a terminal
2. Navigate to the `echo` directory
3. Run the following commands

```
$ npm install
$ npm run build
```

`npm install` downloads all the necessary files needed for the application. 

“npm run build” will execute the build script which uses webpack to package all the required components, and output to a single “echo.js” file in the “dist” directory. 

echo <br>
└─── dist <br>
           └─── echo.js


### Next Steps

Learn how to deploy the app that you have just built.

- [Deploy the web app to sample-server](10-deploy-webapp.md)

