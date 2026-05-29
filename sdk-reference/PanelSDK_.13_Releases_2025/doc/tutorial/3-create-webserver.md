---
stoplight-id: 29otrk2zyndzb
---

# Create a simple web server

## Introduction

This tutorial shows you how to create a web server that runs on `http://localhost:3000`.

You will learn how to:

- Create the content that runs on the web server.
- Run the web server.

## Prerequisites

- A completed plug-in as outlined in the section [Create a Media Composer Plug-in](1-create-mc-plugin.md)
- The plug-in must be installed as in the section [Install a Media Composer Plug-in](2-install-plugin.md)

## Steps

**1. Create the content of the web server**

In this example, the server will only serve one html file which displays the text “Hello World“. In later steps, we will replace this html file by something more meaningful. 

a.) **Create a new folder** called `sample-server` in the parent directory of the sample-plugin.

b.) **Create an HTML file** named `index.html` inside the folder `sample-server`. 

c.) **Place content** in the new file.

```
<!DOCTYPE html>
<html lang="en">

<body>
    <h1>Hello World</h1>
</body>

</html>
```
The folder structure would now look like the following:

sample-plugin <br>
└─── avid-manifest.json <br>
└─── static  <br>
           └─── application.svg

sample-server  <br>
└─── index.html

 <br>

### Next Steps

Learn how to run the web server.

- [Run the web server](4-run-webserver.md)