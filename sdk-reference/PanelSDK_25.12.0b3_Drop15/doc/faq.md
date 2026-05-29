---
stoplight-id: dg46zmo0ltxze
---

# Frequently Asked Questions


### What are the commercials associated with the panelSDK
The Avid panelSDK is free and Avid is not charging anything to be in the program and is also not taking any % from services offered through the panel

### How can I get access to the panel
Reach out to panelsdk_partner_request@avid.com and we can get you started on the path
### Is there a review process for panels developed for Media Composer
Yes there is a review process and this governance team meets 1x per month to review applications and approve or deny requests for panel integrations and we notify the partner directly of the decision
### What is the responsibility of the developer of the 3rd party tools in Media Composer
Most of the responsibilities are outlined in the panelSDK agreement but at a high level
1. Partner needs to register as an Avid developer on Avid.com
1. Partner must maintain compatibility with LTM version of Media Composer
1. Partner must regularly test and qualify their panel with latest version of Media Composer
1. Partner must provide all support for its integration with Media Composer through panel SDK
1. Partner must escalate with Avid any issues related to the panel SDK itself they have found and assist where applicable in problem resolution
1. Partner must engage in pro-actively marketing the resulting workflow/capability to the best of their ability
1. Partner needs to maintain its listing on Avid.com (Avid to provide access and review any and all submissions/content prior to making public)
1. Communicate regularly with Avid to develop GTM plans and execute against those plans
1. Evangelize in the market with Avid directly and through channel partners
1. Co-market at trade events
1. Tracking of when customers are using the panel (is this something that would be possible?)
### How will users gain access to my panel
There will be a directory listing on avid.com that outlines all available panels
1. This directory will provide how your panel works within Media Composer
1. Provide both written summaries of the workflows possible and diagrams that show the workflow
1. Optionally, developers can add video how to’s, demos and even pdfs to the page so that users can
1. The plan is launch this in the coming months
### What versions of Media Composer will the panel be available in
Available for all of MC licences.
### When will versions of Media Composer that support panels be available
The 2023.8 release of Media Composer is the first version that supports panels running in Media Composer

### How do I install the Feature Toggle Files (FTF)?
After receiving FTF zip bundle, extract it and place all the files in the following directories:
- Mac: /Library/Application Support/Avid/Support
- PC: C:\ProgramData\Avid\Support

### Where do I install my plugin?
Place your avpi file at

- Mac: /Library/Application Support/Avid/PanelSDKPlugins/
- PC: C:\ProgramData\Avid\PanelSDKPlugins

### Why doesn't my plugin appear in the Tools menu? 
There could be several reasons why your plugin isn't appearing. For more details, please refer to the Troubleshooting document. 

### How can I create tabbed UI in the panel?
The MC Panel SDK does not support opening new tabs or new floating windows instances from within a panel's web page. All target= "_blank" link targets are programmatically removed from panel web pages. Consequently, if those links do load, the page may end up loading into your default browser.
Therefore, if your panel needs a "tabbed" UI, create it on the same page in the same window using iFrames or other HTML techniques, e.g. https://jqueryui.com/tabs/.

### What video formats are supported for playback in the Panel?
Only certain codecs are supported for playback in the HTML Panel.  High-quality royalty-free WebM codecs such as VP8 and VP9 are supported and can be played back.  However, proprietary codecs such as H.264, H.265 and MPEG layer-3 (MP3) are not able to be played.  Wherever possible you should try and use WebM VP8 or VP9 compressed media.