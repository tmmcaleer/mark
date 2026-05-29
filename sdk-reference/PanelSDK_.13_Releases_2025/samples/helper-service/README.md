

Media Composer provides APIs allowing the the plugin to export files. However, the plugin's code lives in the browser, hence it has no access to local files. As a result, the plugin can't upload files after they are exported. 

This sample demonstrates how we can work around the local file access restriction. There are four components to this sample: app, plugin, helper-server, upload-server. Each of which contains a README.md file that gives simple directions of how to build and run.

- app: provides the entry point as well as all other resources for the plugin's panel webpage. 
- plugin: the files needed to bundle up into the plugin. 
- helper-server: must run on localhost. It has local file access so it is able to upload files to the upload-server. The plugin can make requests for upload to this helper-server instead of the upload-server directly. 
- upload-server: a server which can store files. 

