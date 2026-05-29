---
stoplight-id: pd3i3b7shpkey
---

# Troubleshooting

### My plugin doesn't show up
If you've installed the 'Feature Toggle Files' and the plugin in the correct 
location but the plugin is not showing up under Tools menu, here are some common
troubleshooting steps to identify and resolve the issue: 
1. **Check compatibility** Ensure that the SDK version you use is compatible 
with the version of Media Composer installed. 
2. **Check License** Make sure you Media Composer Ultimate or Enterprise license was activated.
3. **Check network ports** If no plugins can be loaded at all including the 
sample plugins, make sure that the following ports are not in use by other 
applications:
    - API port and plugin port: These are internal ports used for communication 
between Media Composer
and the gateway and can be configured by modifying the port number in the config 
file located at:
    ```
    Mac: /Library/Application Support/Avid/APIGateway/config.json
    PC: C:\ProgramData\Avid\APIGateway\config.json
    ```
    - Media Composer PanelSDK server ports: This is a range of ports which Media Composer can pick one from. It can be configured by modifying the config file located at:
    ```
    Mac: /Library/Application Support/Avid/Avid Media Composer/PanelSDK.json
    PC: C:\ProgramData\Avid\Avid Media Composer\PanelSDK.json
    ```

### Other plugins are loaded just fine except for my plugin

1. **Check avid-manifest.json file**  check your avid-manifest.json file for errors or missing 
properties.
2. **Check icon file** An icon file is required and must be specified in avid-manifest.json. Make sure it is included in the plugin bundle.
3. **Check structure** The avid-manifest.json file must be at the root of your avpi. A common problem when someone manually creates the avpi zip file from the entire directory instead of just the **contents**.
