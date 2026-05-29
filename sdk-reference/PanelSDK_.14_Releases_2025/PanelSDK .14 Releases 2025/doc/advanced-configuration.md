## Avid API Gateway - Advanced Configuration
Avid API Gateway (avid-api-gateway.exe) facilitates secure communication between Media Composer and your plugin panel. 

Upon execution, the gateway will open two ports specified in a configuration file located at

- Mac: "/Library/Application Support/Avid/APIGateway/config.json"

- PC: “%PROGRAMDATA%”\Avid\APIGateway\config.json

In the event of a port conflict, please modify the configuration file to reference available ports for the gateway to acquire. 
```
{
    "apiPort": 4920, 
    "pluginPort": 4930,
    "logLevel": "info"
}
```
Log levels are an optional parameter that defaults to disabled. They can be set to one of the following levels: "trace", "debug", "info", "warn", or "error"

The log file is created in the same directory as config.json. Enabling logging while lacking permission to create the log file will cause avid-api-gateway.exe to exit with an error. To redirect the log file to a different location, use the "logFilepath" option in config.json

Media Composer server port
Media Composer operates a server for communication with Avid API Gateway. The server opens a port configurable in the configuration file at

- Mac: "/Library/Application Support/Avid/Avid Media Composer/PanelSDK.json"

- PC: “%PROGRAMDATA%”\Avid\Avid Media Composer\PanelSDK.json”

The configuration file specifies a range of ports from which Media Composer will pick one that is available. 
```
{
	"ports": "9100-9110"
}
```