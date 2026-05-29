---
stoplight-id: xvemctdapbefa
---

# Configure the Web App

## Introduction

This tutorial shows you how to set up the web app that you configured in the tutorial "Create requests from the Plugin Panel"

## Prerequisites

- Tutorial - [Create Requests from the Plugin Panel](5-create-mc-request.md)

## Steps

1. Create a new folder called "echo" 
2. Create a new file called `package.json` with following content

```
{
  "name": "sample-echo",
  "version": "0.1.0",
  "description": "Sample application to demonstrate how to use echo API",
  "private": true,
  "scripts": {
    "test": "echo \"Error: no test sepcified\" && exit 1",
    "build": "webpack --config webpack.config.js"
  },
  "devDependencies": {
    "@grpc/grpc-js": "~1.1.8",
    "@grpc/proto-loader": "~0.5.4",
    "grpc-web": "~1.3.0",
    "google-protobuf": "~3.14.0",
    "async": "~1.5.2",
    "css-loader": "^6.5.1",
    "lodash": "~4.17.0",
    "style-loader": "^3.3.1",
    "webpack": "^5.67.0",
    "webpack-cli": "^4.9.2"
  }
}

```

The only interesting property in `package.json` is the `build` property which specifies the command line to run when we build the application. In this example, we use webpack, a Node.js bundler, to compress all material in this application, and produce one single javascript file that contains everything we need to run our application. 

User can enter a message in the text box, then click the submit button. Media Composer will response to the request. Then the Plugin Panel will display the response under the Response section.

3. Create `webpack.config.js` which specifies how the application is created

```
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/echo.js',
  output: {
    filename: 'echo.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  devtool: 'eval'
};

```
In this configuration file, we specifies:

1. `entry` property: the entry point of the application. 
2. `output` property: information about the output file name and the directory where the output file will be produced. 

```
  entry: './src/echo.js',
  output: {
    filename: 'echo.js',
    path: path.resolve(__dirname, 'dist'),
  },

```
In our example, the entry is point is located at “src” directory , and the output is at “dist”. 
We need to create the both directories since they don’t exist. 
On the command line terminal, enter the following commands. 

```
$ mkdir -p src
$ mkdir -p dist

```

4. create all the files we need for this web app: index.html, echo.js, and echo.css.

```
$ cd src
$ touch index.html
$ touch echo.js
$ touch echo.css

```
5. Copy javascript library provided in the PanelSDK, and place it within our echo application. 
6. Copy the folder `grpc-web` provided with the PanelSDK. Paste it in the `src` directory. 

Now we have created a folder structure such as the one below:

sample-plugin <br>
└─── avid-manifest.json <br>
└─── static<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─── application.svg<br>

sample-server<br>
└─── index.html

echo<br>
└─── package.json<br>
└─── webpack.config.js<br>
└─── dist<br>
└─── src<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─── index.html<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─── echo.js<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─── echo.css<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─── grpc-web<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─── MCAPI_grpc_web_pb.js<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─── MCAPI_pb.js<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─── MCAPI_Types_pb.js<br>

### Next Steps

Next, you'll create a user interface by adding content to the files you've created in this section  

- [Create the UI](7-create-ui.md)

