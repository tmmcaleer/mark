# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [MCAPI.proto](#MCAPI-proto)
    - [File-level Extensions](#MCAPI-proto-extensions)
  
    - [MCAPI](#mcapi-MCAPI)
  
- [MCAPI_Types.proto](#MCAPI_Types-proto)
    - [AddMarkerRequest](#mcapi-AddMarkerRequest)
    - [AddMarkerRequestBody](#mcapi-AddMarkerRequestBody)
    - [AddMarkerResponse](#mcapi-AddMarkerResponse)
    - [AddMarkerResponseBody](#mcapi-AddMarkerResponseBody)
    - [AddMarkersRequest](#mcapi-AddMarkersRequest)
    - [AddMarkersRequestBody](#mcapi-AddMarkersRequestBody)
    - [AddMarkersResponse](#mcapi-AddMarkersResponse)
    - [AddMarkersResponseBody](#mcapi-AddMarkersResponseBody)
    - [ChangeMarkerRequest](#mcapi-ChangeMarkerRequest)
    - [ChangeMarkerRequestBody](#mcapi-ChangeMarkerRequestBody)
    - [ChangeMarkerRequestBody.MarkerInfo](#mcapi-ChangeMarkerRequestBody-MarkerInfo)
    - [ChangeMarkerResponse](#mcapi-ChangeMarkerResponse)
    - [ChangeMarkerResponseBody](#mcapi-ChangeMarkerResponseBody)
    - [CloseBinRequest](#mcapi-CloseBinRequest)
    - [CloseBinRequestBody](#mcapi-CloseBinRequestBody)
    - [CloseBinResponse](#mcapi-CloseBinResponse)
    - [CloseBinResponseBody](#mcapi-CloseBinResponseBody)
    - [ColumnInfo](#mcapi-ColumnInfo)
    - [CommandError](#mcapi-CommandError)
    - [ConfigureSRTStreamRequest](#mcapi-ConfigureSRTStreamRequest)
    - [ConfigureSRTStreamRequestBody](#mcapi-ConfigureSRTStreamRequestBody)
    - [ConfigureSRTStreamResponse](#mcapi-ConfigureSRTStreamResponse)
    - [ConfigureSRTStreamResponseBody](#mcapi-ConfigureSRTStreamResponseBody)
    - [CopyBinItemsRequest](#mcapi-CopyBinItemsRequest)
    - [CopyBinItemsRequestBody](#mcapi-CopyBinItemsRequestBody)
    - [CopyBinItemsResponse](#mcapi-CopyBinItemsResponse)
    - [CopyBinItemsResponseBody](#mcapi-CopyBinItemsResponseBody)
    - [CreateBinRequest](#mcapi-CreateBinRequest)
    - [CreateBinRequestBody](#mcapi-CreateBinRequestBody)
    - [CreateBinResponse](#mcapi-CreateBinResponse)
    - [CreateBinResponseBody](#mcapi-CreateBinResponseBody)
    - [CreateClipsFromAvidMediaFilesFolderRequest](#mcapi-CreateClipsFromAvidMediaFilesFolderRequest)
    - [CreateClipsFromAvidMediaFilesFolderRequestBody](#mcapi-CreateClipsFromAvidMediaFilesFolderRequestBody)
    - [CreateClipsFromAvidMediaFilesFolderResponse](#mcapi-CreateClipsFromAvidMediaFilesFolderResponse)
    - [CreateClipsFromAvidMediaFilesFolderResponseBody](#mcapi-CreateClipsFromAvidMediaFilesFolderResponseBody)
    - [CreateCustomColumnRequest](#mcapi-CreateCustomColumnRequest)
    - [CreateCustomColumnRequestBody](#mcapi-CreateCustomColumnRequestBody)
    - [CreateCustomColumnResponse](#mcapi-CreateCustomColumnResponse)
    - [CreateCustomColumnResponseBody](#mcapi-CreateCustomColumnResponseBody)
    - [CreateSubClipRequest](#mcapi-CreateSubClipRequest)
    - [CreateSubClipRequestBody](#mcapi-CreateSubClipRequestBody)
    - [CreateSubClipResponse](#mcapi-CreateSubClipResponse)
    - [CreateSubClipResponseBody](#mcapi-CreateSubClipResponseBody)
    - [DeleteMarkersRequest](#mcapi-DeleteMarkersRequest)
    - [DeleteMarkersRequestBody](#mcapi-DeleteMarkersRequestBody)
    - [DeleteMarkersResponse](#mcapi-DeleteMarkersResponse)
    - [DeleteMarkersResponseBody](#mcapi-DeleteMarkersResponseBody)
    - [DoCommandRequest](#mcapi-DoCommandRequest)
    - [DoCommandRequestBody](#mcapi-DoCommandRequestBody)
    - [DoCommandResponse](#mcapi-DoCommandResponse)
    - [DoCommandResponseBody](#mcapi-DoCommandResponseBody)
    - [DuplicateBinItemsRequest](#mcapi-DuplicateBinItemsRequest)
    - [DuplicateBinItemsRequestBody](#mcapi-DuplicateBinItemsRequestBody)
    - [DuplicateBinItemsResponse](#mcapi-DuplicateBinItemsResponse)
    - [DuplicateBinItemsResponseBody](#mcapi-DuplicateBinItemsResponseBody)
    - [EchoRequest](#mcapi-EchoRequest)
    - [EchoRequestBody](#mcapi-EchoRequestBody)
    - [EchoResponse](#mcapi-EchoResponse)
    - [EchoResponseBody](#mcapi-EchoResponseBody)
    - [ExportEDLRequest](#mcapi-ExportEDLRequest)
    - [ExportEDLRequestBody](#mcapi-ExportEDLRequestBody)
    - [ExportEDLResponse](#mcapi-ExportEDLResponse)
    - [ExportEDLResponseBody](#mcapi-ExportEDLResponseBody)
    - [ExportFileRequest](#mcapi-ExportFileRequest)
    - [ExportFileRequestBody](#mcapi-ExportFileRequestBody)
    - [ExportFileResponse](#mcapi-ExportFileResponse)
    - [ExportFileResponseBody](#mcapi-ExportFileResponseBody)
    - [FrameRate](#mcapi-FrameRate)
    - [GetAppInfoRequest](#mcapi-GetAppInfoRequest)
    - [GetAppInfoRequestBody](#mcapi-GetAppInfoRequestBody)
    - [GetAppInfoResponse](#mcapi-GetAppInfoResponse)
    - [GetAppInfoResponseBody](#mcapi-GetAppInfoResponseBody)
    - [GetBinColumnInfoRequest](#mcapi-GetBinColumnInfoRequest)
    - [GetBinColumnInfoRequestBody](#mcapi-GetBinColumnInfoRequestBody)
    - [GetBinColumnInfoResponse](#mcapi-GetBinColumnInfoResponse)
    - [GetBinColumnInfoResponseBody](#mcapi-GetBinColumnInfoResponseBody)
    - [GetBinColumnInfoResponseBody.BinColumnInfo](#mcapi-GetBinColumnInfoResponseBody-BinColumnInfo)
    - [GetBinFromMobRequest](#mcapi-GetBinFromMobRequest)
    - [GetBinFromMobRequestBody](#mcapi-GetBinFromMobRequestBody)
    - [GetBinFromMobResponse](#mcapi-GetBinFromMobResponse)
    - [GetBinFromMobResponseBody](#mcapi-GetBinFromMobResponseBody)
    - [GetBinInfoRequest](#mcapi-GetBinInfoRequest)
    - [GetBinInfoRequestBody](#mcapi-GetBinInfoRequestBody)
    - [GetBinInfoResponse](#mcapi-GetBinInfoResponse)
    - [GetBinInfoResponseBody](#mcapi-GetBinInfoResponseBody)
    - [GetBinsRequest](#mcapi-GetBinsRequest)
    - [GetBinsRequestBody](#mcapi-GetBinsRequestBody)
    - [GetBinsResponse](#mcapi-GetBinsResponse)
    - [GetBinsResponseBody](#mcapi-GetBinsResponseBody)
    - [GetCustomProjectDataRequest](#mcapi-GetCustomProjectDataRequest)
    - [GetCustomProjectDataRequestBody](#mcapi-GetCustomProjectDataRequestBody)
    - [GetCustomProjectDataResponse](#mcapi-GetCustomProjectDataResponse)
    - [GetCustomProjectDataResponseBody](#mcapi-GetCustomProjectDataResponseBody)
    - [GetHostInfoRequest](#mcapi-GetHostInfoRequest)
    - [GetHostInfoRequestBody](#mcapi-GetHostInfoRequestBody)
    - [GetHostInfoResponse](#mcapi-GetHostInfoResponse)
    - [GetHostInfoResponseBody](#mcapi-GetHostInfoResponseBody)
    - [GetListOfBinItemsRequest](#mcapi-GetListOfBinItemsRequest)
    - [GetListOfBinItemsRequestBody](#mcapi-GetListOfBinItemsRequestBody)
    - [GetListOfBinItemsResponse](#mcapi-GetListOfBinItemsResponse)
    - [GetListOfBinItemsResponseBody](#mcapi-GetListOfBinItemsResponseBody)
    - [GetListOfCommandsRequest](#mcapi-GetListOfCommandsRequest)
    - [GetListOfCommandsRequestBody](#mcapi-GetListOfCommandsRequestBody)
    - [GetListOfCommandsResponse](#mcapi-GetListOfCommandsResponse)
    - [GetListOfCommandsResponseBody](#mcapi-GetListOfCommandsResponseBody)
    - [GetListOfCommandsResponseBody.CommandInfo](#mcapi-GetListOfCommandsResponseBody-CommandInfo)
    - [GetListOfExportEDLSettingsRequest](#mcapi-GetListOfExportEDLSettingsRequest)
    - [GetListOfExportEDLSettingsRequestBody](#mcapi-GetListOfExportEDLSettingsRequestBody)
    - [GetListOfExportEDLSettingsResponse](#mcapi-GetListOfExportEDLSettingsResponse)
    - [GetListOfExportEDLSettingsResponseBody](#mcapi-GetListOfExportEDLSettingsResponseBody)
    - [GetListOfExportSettingsRequest](#mcapi-GetListOfExportSettingsRequest)
    - [GetListOfExportSettingsRequestBody](#mcapi-GetListOfExportSettingsRequestBody)
    - [GetListOfExportSettingsResponse](#mcapi-GetListOfExportSettingsResponse)
    - [GetListOfExportSettingsResponseBody](#mcapi-GetListOfExportSettingsResponseBody)
    - [GetListOfImportSettingsRequest](#mcapi-GetListOfImportSettingsRequest)
    - [GetListOfImportSettingsRequestBody](#mcapi-GetListOfImportSettingsRequestBody)
    - [GetListOfImportSettingsResponse](#mcapi-GetListOfImportSettingsResponse)
    - [GetListOfImportSettingsResponseBody](#mcapi-GetListOfImportSettingsResponseBody)
    - [GetListOfJobQueuesRequest](#mcapi-GetListOfJobQueuesRequest)
    - [GetListOfJobQueuesRequestBody](#mcapi-GetListOfJobQueuesRequestBody)
    - [GetListOfJobQueuesResponse](#mcapi-GetListOfJobQueuesResponse)
    - [GetListOfJobQueuesResponseBody](#mcapi-GetListOfJobQueuesResponseBody)
    - [GetListOfJobQueuesResponseBody.JobsQueue](#mcapi-GetListOfJobQueuesResponseBody-JobsQueue)
    - [GetListOfLinkSettingsRequest](#mcapi-GetListOfLinkSettingsRequest)
    - [GetListOfLinkSettingsRequestBody](#mcapi-GetListOfLinkSettingsRequestBody)
    - [GetListOfLinkSettingsResponse](#mcapi-GetListOfLinkSettingsResponse)
    - [GetListOfLinkSettingsResponseBody](#mcapi-GetListOfLinkSettingsResponseBody)
    - [GetMarkersRequest](#mcapi-GetMarkersRequest)
    - [GetMarkersRequestBody](#mcapi-GetMarkersRequestBody)
    - [GetMarkersRequestBody.offsetFilter](#mcapi-GetMarkersRequestBody-offsetFilter)
    - [GetMarkersRequestBody.tcFilter](#mcapi-GetMarkersRequestBody-tcFilter)
    - [GetMarkersResponse](#mcapi-GetMarkersResponse)
    - [GetMarkersResponseBody](#mcapi-GetMarkersResponseBody)
    - [GetMediaVolumeItemsRequest](#mcapi-GetMediaVolumeItemsRequest)
    - [GetMediaVolumeItemsRequestBody](#mcapi-GetMediaVolumeItemsRequestBody)
    - [GetMediaVolumeItemsResponse](#mcapi-GetMediaVolumeItemsResponse)
    - [GetMediaVolumeItemsResponseBody](#mcapi-GetMediaVolumeItemsResponseBody)
    - [GetMediaVolumeItemsResponseBody.MediaVolumeItem](#mcapi-GetMediaVolumeItemsResponseBody-MediaVolumeItem)
    - [GetMediaVolumeListRequest](#mcapi-GetMediaVolumeListRequest)
    - [GetMediaVolumeListRequestBody](#mcapi-GetMediaVolumeListRequestBody)
    - [GetMediaVolumeListResponse](#mcapi-GetMediaVolumeListResponse)
    - [GetMediaVolumeListResponseBody](#mcapi-GetMediaVolumeListResponseBody)
    - [GetMediaVolumeListResponseBody.MediaVolume](#mcapi-GetMediaVolumeListResponseBody-MediaVolume)
    - [GetMobInfoRequest](#mcapi-GetMobInfoRequest)
    - [GetMobInfoRequestBody](#mcapi-GetMobInfoRequestBody)
    - [GetMobInfoResponse](#mcapi-GetMobInfoResponse)
    - [GetMobInfoResponseBody](#mcapi-GetMobInfoResponseBody)
    - [GetMobTrackInfoRequest](#mcapi-GetMobTrackInfoRequest)
    - [GetMobTrackInfoRequestBody](#mcapi-GetMobTrackInfoRequestBody)
    - [GetMobTrackInfoResponse](#mcapi-GetMobTrackInfoResponse)
    - [GetMobTrackInfoResponseBody](#mcapi-GetMobTrackInfoResponseBody)
    - [GetOTSSessionStatusRequest](#mcapi-GetOTSSessionStatusRequest)
    - [GetOTSSessionStatusRequestBody](#mcapi-GetOTSSessionStatusRequestBody)
    - [GetOTSSessionStatusResponse](#mcapi-GetOTSSessionStatusResponse)
    - [GetOTSSessionStatusResponseBody](#mcapi-GetOTSSessionStatusResponseBody)
    - [GetOpenProjectInfoRequest](#mcapi-GetOpenProjectInfoRequest)
    - [GetOpenProjectInfoRequestBody](#mcapi-GetOpenProjectInfoRequestBody)
    - [GetOpenProjectInfoResponse](#mcapi-GetOpenProjectInfoResponse)
    - [GetOpenProjectInfoResponseBody](#mcapi-GetOpenProjectInfoResponseBody)
    - [GetSRTStreamSettingsRequest](#mcapi-GetSRTStreamSettingsRequest)
    - [GetSRTStreamSettingsRequestBody](#mcapi-GetSRTStreamSettingsRequestBody)
    - [GetSRTStreamSettingsResponse](#mcapi-GetSRTStreamSettingsResponse)
    - [GetSRTStreamSettingsResponseBody](#mcapi-GetSRTStreamSettingsResponseBody)
    - [GetValuesRequest](#mcapi-GetValuesRequest)
    - [GetValuesRequestBody](#mcapi-GetValuesRequestBody)
    - [GetValuesResponse](#mcapi-GetValuesResponse)
    - [GetValuesResponseBody](#mcapi-GetValuesResponseBody)
    - [GetViewerMobsRequest](#mcapi-GetViewerMobsRequest)
    - [GetViewerMobsRequestBody](#mcapi-GetViewerMobsRequestBody)
    - [GetViewerMobsResponse](#mcapi-GetViewerMobsResponse)
    - [GetViewerMobsResponseBody](#mcapi-GetViewerMobsResponseBody)
    - [ImportFileRequest](#mcapi-ImportFileRequest)
    - [ImportFileRequestBody](#mcapi-ImportFileRequestBody)
    - [ImportFileResponse](#mcapi-ImportFileResponse)
    - [ImportFileResponseBody](#mcapi-ImportFileResponseBody)
    - [IsCommandsEnabledRequest](#mcapi-IsCommandsEnabledRequest)
    - [IsCommandsEnabledRequestBody](#mcapi-IsCommandsEnabledRequestBody)
    - [IsCommandsEnabledResponse](#mcapi-IsCommandsEnabledResponse)
    - [IsCommandsEnabledResponseBody](#mcapi-IsCommandsEnabledResponseBody)
    - [IsCommandsEnabledResponseBody.CommandEnableInfo](#mcapi-IsCommandsEnabledResponseBody-CommandEnableInfo)
    - [LinkFileRequest](#mcapi-LinkFileRequest)
    - [LinkFileRequestBody](#mcapi-LinkFileRequestBody)
    - [LinkFileResponse](#mcapi-LinkFileResponse)
    - [LinkFileResponseBody](#mcapi-LinkFileResponseBody)
    - [LoadMobsIntoViewerRequest](#mcapi-LoadMobsIntoViewerRequest)
    - [LoadMobsIntoViewerRequestBody](#mcapi-LoadMobsIntoViewerRequestBody)
    - [LoadMobsIntoViewerResponse](#mcapi-LoadMobsIntoViewerResponse)
    - [LoadMobsIntoViewerResponseBody](#mcapi-LoadMobsIntoViewerResponseBody)
    - [LoadSettingRequest](#mcapi-LoadSettingRequest)
    - [LoadSettingRequestBody](#mcapi-LoadSettingRequestBody)
    - [LoadSettingResponse](#mcapi-LoadSettingResponse)
    - [MobInViewer](#mcapi-MobInViewer)
    - [MoveBinItemsRequest](#mcapi-MoveBinItemsRequest)
    - [MoveBinItemsRequestBody](#mcapi-MoveBinItemsRequestBody)
    - [MoveBinItemsResponse](#mcapi-MoveBinItemsResponse)
    - [MoveBinItemsResponseBody](#mcapi-MoveBinItemsResponseBody)
    - [OpenBinRequest](#mcapi-OpenBinRequest)
    - [OpenBinRequestBody](#mcapi-OpenBinRequestBody)
    - [OpenBinResponse](#mcapi-OpenBinResponse)
    - [OpenBinResponseBody](#mcapi-OpenBinResponseBody)
    - [RequestHeader](#mcapi-RequestHeader)
    - [RequestMarkerInfo](#mcapi-RequestMarkerInfo)
    - [ResponseHeader](#mcapi-ResponseHeader)
    - [ResponseMarkerInfo](#mcapi-ResponseMarkerInfo)
    - [ScanAvidMediaFilesFolderRequest](#mcapi-ScanAvidMediaFilesFolderRequest)
    - [ScanAvidMediaFilesFolderRequestBody](#mcapi-ScanAvidMediaFilesFolderRequestBody)
    - [ScanAvidMediaFilesFolderResponse](#mcapi-ScanAvidMediaFilesFolderResponse)
    - [ScanAvidMediaFilesFolderResponseBody](#mcapi-ScanAvidMediaFilesFolderResponseBody)
    - [SelectMobsInBinRequest](#mcapi-SelectMobsInBinRequest)
    - [SelectMobsInBinRequestBody](#mcapi-SelectMobsInBinRequestBody)
    - [SelectMobsInBinResponse](#mcapi-SelectMobsInBinResponse)
    - [SelectMobsInBinResponseBody](#mcapi-SelectMobsInBinResponseBody)
    - [SetCustomProjectDataRequest](#mcapi-SetCustomProjectDataRequest)
    - [SetCustomProjectDataRequestBody](#mcapi-SetCustomProjectDataRequestBody)
    - [SetCustomProjectDataResponse](#mcapi-SetCustomProjectDataResponse)
    - [SetCustomProjectDataResponseBody](#mcapi-SetCustomProjectDataResponseBody)
    - [SetMobInfoRequest](#mcapi-SetMobInfoRequest)
    - [SetMobInfoRequestBody](#mcapi-SetMobInfoRequestBody)
    - [SetMobInfoResponse](#mcapi-SetMobInfoResponse)
    - [SetMobInfoResponseBody](#mcapi-SetMobInfoResponseBody)
    - [SetMobInfoResponseBody.MobFailure](#mcapi-SetMobInfoResponseBody-MobFailure)
    - [SetOTSSessionStatusRequest](#mcapi-SetOTSSessionStatusRequest)
    - [SetOTSSessionStatusRequestBody](#mcapi-SetOTSSessionStatusRequestBody)
    - [SetOTSSessionStatusResponse](#mcapi-SetOTSSessionStatusResponse)
    - [SetOTSSessionStatusResponseBody](#mcapi-SetOTSSessionStatusResponseBody)
    - [StartPlayRequest](#mcapi-StartPlayRequest)
    - [StartPlayRequestBody](#mcapi-StartPlayRequestBody)
    - [StartPlayResponse](#mcapi-StartPlayResponse)
    - [StartPlayResponseBody](#mcapi-StartPlayResponseBody)
    - [StopPlayRequest](#mcapi-StopPlayRequest)
    - [StopPlayRequestBody](#mcapi-StopPlayRequestBody)
    - [StopPlayResponse](#mcapi-StopPlayResponse)
    - [StopPlayResponseBody](#mcapi-StopPlayResponseBody)
    - [Timestamp](#mcapi-Timestamp)
    - [TrackInfo](#mcapi-TrackInfo)
    - [TrackInfoList](#mcapi-TrackInfoList)
    - [TrackLabel](#mcapi-TrackLabel)
    - [TrackList](#mcapi-TrackList)
  
    - [AudioTrackType](#mcapi-AudioTrackType)
    - [CommandErrorType](#mcapi-CommandErrorType)
    - [ConfigureSRTStreamRequestBody.ModeOption](#mcapi-ConfigureSRTStreamRequestBody-ModeOption)
    - [ConfigureSRTStreamRequestBody.QualityOption](#mcapi-ConfigureSRTStreamRequestBody-QualityOption)
    - [CreateBinRequestBody.OpenBinOption](#mcapi-CreateBinRequestBody-OpenBinOption)
    - [ExportFileOption](#mcapi-ExportFileOption)
    - [GetAppInfoResponseBody.AppBusyStatus](#mcapi-GetAppInfoResponseBody-AppBusyStatus)
    - [GetBinsRequestBody.GetBinsFlag](#mcapi-GetBinsRequestBody-GetBinsFlag)
    - [GetListOfBinItemsRequestBody.BinItemFlags](#mcapi-GetListOfBinItemsRequestBody-BinItemFlags)
    - [GetMediaVolumeItemsRequestBody.VolumeItemFilter](#mcapi-GetMediaVolumeItemsRequestBody-VolumeItemFilter)
    - [GetOTSSessionStatusResponseBody.ModeOption](#mcapi-GetOTSSessionStatusResponseBody-ModeOption)
    - [GetOTSSessionStatusResponseBody.QualityOption](#mcapi-GetOTSSessionStatusResponseBody-QualityOption)
    - [GetSRTStreamSettingsResponseBody.ModeOption](#mcapi-GetSRTStreamSettingsResponseBody-ModeOption)
    - [GetSRTStreamSettingsResponseBody.QualityOption](#mcapi-GetSRTStreamSettingsResponseBody-QualityOption)
    - [ImportFileOption](#mcapi-ImportFileOption)
    - [MarkerColor](#mcapi-MarkerColor)
    - [SetOTSSessionStatusRequestBody.ModeOption](#mcapi-SetOTSSessionStatusRequestBody-ModeOption)
    - [SetOTSSessionStatusRequestBody.QualityOption](#mcapi-SetOTSSessionStatusRequestBody-QualityOption)
    - [Stereoscopic](#mcapi-Stereoscopic)
    - [TaskStatus](#mcapi-TaskStatus)
    - [TrackType](#mcapi-TrackType)
    - [ViewerType](#mcapi-ViewerType)
  
- [Scalar Value Types](#scalar-value-types)



<a name="MCAPI-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## MCAPI.proto


 <!-- end messages -->

 <!-- end enums -->


<a name="MCAPI-proto-extensions"></a>

### File-level Extensions
| Extension | Type | Base | Number | Description |
| --------- | ---- | ---- | ------ | ----------- |
| api_scope | string | .google.protobuf.MethodOptions | 10778 |  |

 <!-- end HasExtensions -->


<a name="mcapi-MCAPI"></a>

### MCAPI
MCAPI service

| Method Name | Request Type | Response Type | Description |
| ----------- | ------------ | ------------- | ------------|
| Echo | [EchoRequest](#mcapi-EchoRequest) | [EchoResponse](#mcapi-EchoResponse) | Echo the same message sent from the request. For testing purpose |
| GetValues | [GetValuesRequest](#mcapi-GetValuesRequest) | [GetValuesResponse](#mcapi-GetValuesResponse) stream | Get a list of number incremented from 0 to a specified count. For testing purpose |
| GetAppInfo | [GetAppInfoRequest](#mcapi-GetAppInfoRequest) | [GetAppInfoResponse](#mcapi-GetAppInfoResponse) | Get application Info |
| GetHostInfo | [GetHostInfoRequest](#mcapi-GetHostInfoRequest) | [GetHostInfoResponse](#mcapi-GetHostInfoResponse) | Get workstation name |
| GetBins | [GetBinsRequest](#mcapi-GetBinsRequest) | [GetBinsResponse](#mcapi-GetBinsResponse) stream | Get list of bins in currently opened project, including other bins and Nexis bins. |
| GetBinInfo | [GetBinInfoRequest](#mcapi-GetBinInfoRequest) | [GetBinInfoResponse](#mcapi-GetBinInfoResponse) | Get information of the specified bin |
| GetBinColumnInfo | [GetBinColumnInfoRequest](#mcapi-GetBinColumnInfoRequest) | [GetBinColumnInfoResponse](#mcapi-GetBinColumnInfoResponse) | Get information about all bin columns of the specified bin |
| GetMobInfo | [GetMobInfoRequest](#mcapi-GetMobInfoRequest) | [GetMobInfoResponse](#mcapi-GetMobInfoResponse) stream | Get information of the specified mob |
| SetMobInfo | [SetMobInfoRequest](#mcapi-SetMobInfoRequest) | [SetMobInfoResponse](#mcapi-SetMobInfoResponse) | Set Bin column information for the specified mob in a opened bin. The mob must be visible based on the Set Bin Display dialog. |
| GetMobTrackInfo | [GetMobTrackInfoRequest](#mcapi-GetMobTrackInfoRequest) | [GetMobTrackInfoResponse](#mcapi-GetMobTrackInfoResponse) | Get the track information for a specified mob. |
| CreateBin | [CreateBinRequest](#mcapi-CreateBinRequest) | [CreateBinResponse](#mcapi-CreateBinResponse) | Create a new bin in currently opened project path. |
| OpenBin | [OpenBinRequest](#mcapi-OpenBinRequest) | [OpenBinResponse](#mcapi-OpenBinResponse) | Open a bin from the currently opened project, including other bins and Nexis bins. |
| ConfigureSRTStream | [ConfigureSRTStreamRequest](#mcapi-ConfigureSRTStreamRequest) | [ConfigureSRTStreamResponse](#mcapi-ConfigureSRTStreamResponse) | Configure SRT stream. Modifies file "OpenIO_SRT_settings.xml" with new settings. |
| GetSRTStreamSettings | [GetSRTStreamSettingsRequest](#mcapi-GetSRTStreamSettingsRequest) | [GetSRTStreamSettingsResponse](#mcapi-GetSRTStreamSettingsResponse) | Configure SRT stream. Modifies file "OpenIO_SRT_settings.xml" with new settings. |
| SetOTSSessionStatus | [SetOTSSessionStatusRequest](#mcapi-SetOTSSessionStatusRequest) | [SetOTSSessionStatusResponse](#mcapi-SetOTSSessionStatusResponse) | Set transmision status for the session. |
| GetOTSSessionStatus | [GetOTSSessionStatusRequest](#mcapi-GetOTSSessionStatusRequest) | [GetOTSSessionStatusResponse](#mcapi-GetOTSSessionStatusResponse) | Get transmision status for the session. |
| GetMediaVolumeList | [GetMediaVolumeListRequest](#mcapi-GetMediaVolumeListRequest) | [GetMediaVolumeListResponse](#mcapi-GetMediaVolumeListResponse) | Returned a list of volumes that have Avid media files folder |
| GetMediaVolumeItems | [GetMediaVolumeItemsRequest](#mcapi-GetMediaVolumeItemsRequest) | [GetMediaVolumeItemsResponse](#mcapi-GetMediaVolumeItemsResponse) | Walk Avid Media files directories on a specified media volume |
| GetListOfBinItems | [GetListOfBinItemsRequest](#mcapi-GetListOfBinItemsRequest) | [GetListOfBinItemsResponse](#mcapi-GetListOfBinItemsResponse) stream | Get list of items in an already opened bin. Items can be filtered by several parameters, including hidden, selected, master clips, sequences, and more. |
| GetOpenProjectInfo | [GetOpenProjectInfoRequest](#mcapi-GetOpenProjectInfoRequest) | [GetOpenProjectInfoResponse](#mcapi-GetOpenProjectInfoResponse) | Get information such as frame rate, color space, etc. for the currently opened project |
| GetCustomProjectData | [GetCustomProjectDataRequest](#mcapi-GetCustomProjectDataRequest) | [GetCustomProjectDataResponse](#mcapi-GetCustomProjectDataResponse) | Retrieve vendor provided information from the project |
| SetCustomProjectData | [SetCustomProjectDataRequest](#mcapi-SetCustomProjectDataRequest) | [SetCustomProjectDataResponse](#mcapi-SetCustomProjectDataResponse) | Store vendor provided information in the project based on a key. Vendor must respect GDR privacy requirements. Data must be encrypted if it includes user identifiable data and allow data to be deleted |
| ScanAvidMediaFilesFolder | [ScanAvidMediaFilesFolderRequest](#mcapi-ScanAvidMediaFilesFolderRequest) | [ScanAvidMediaFilesFolderResponse](#mcapi-ScanAvidMediaFilesFolderResponse) | Scan the specified Avid Media Files Folder and update/create PMR and MDB files. |
| CreateClipsFromAvidMediaFilesFolder | [CreateClipsFromAvidMediaFilesFolderRequest](#mcapi-CreateClipsFromAvidMediaFilesFolderRequest) | [CreateClipsFromAvidMediaFilesFolderResponse](#mcapi-CreateClipsFromAvidMediaFilesFolderResponse) | Create clips in the specified bin based on MDB file in the given Avid Media Files folder. If the destination bin isn't opened, the call will fail. |
| CreateCustomColumn | [CreateCustomColumnRequest](#mcapi-CreateCustomColumnRequest) | [CreateCustomColumnResponse](#mcapi-CreateCustomColumnResponse) | Create a custom column in a specified opened bin. If column already exists, an error will be returned. Use SetMobInfo to set value for the column. |
| GetListOfImportSettings | [GetListOfImportSettingsRequest](#mcapi-GetListOfImportSettingsRequest) | [GetListOfImportSettingsResponse](#mcapi-GetListOfImportSettingsResponse) | Returns a list of available import settings |
| ImportFile | [ImportFileRequest](#mcapi-ImportFileRequest) | [ImportFileResponse](#mcapi-ImportFileResponse) | Import a file from a file path using an import-specific setting from Media Composer. Clip is added to to the specified destination bin. Returns the mobID of the resulting clip. |
| GetListOfExportEDLSettings | [GetListOfExportEDLSettingsRequest](#mcapi-GetListOfExportEDLSettingsRequest) | [GetListOfExportEDLSettingsResponse](#mcapi-GetListOfExportEDLSettingsResponse) | Returns a list of available List Tool EDL settings |
| ExportEDL | [ExportEDLRequest](#mcapi-ExportEDLRequest) | [ExportEDLResponse](#mcapi-ExportEDLResponse) | Create an EDL file based on a specified sequence using an EDL-specific setting from the Media Composer List Tool. Return the full path to the EDL. |
| GetListOfExportSettings | [GetListOfExportSettingsRequest](#mcapi-GetListOfExportSettingsRequest) | [GetListOfExportSettingsResponse](#mcapi-GetListOfExportSettingsResponse) | Returns a list of available export settings |
| ExportFile | [ExportFileRequest](#mcapi-ExportFileRequest) | [ExportFileResponse](#mcapi-ExportFileResponse) | Export file based on a specified mob using an export-specific setting from the Media Composer. Return the full path to the new file. |
| LoadSetting | [LoadSettingRequest](#mcapi-LoadSettingRequest) | [LoadSettingResponse](#mcapi-LoadSettingResponse) | Load xml setting data and create a visible read-only non-persistent Media Composer setting. It's useful for export, import, List Tool settings. The name of any setting should include a vendor prefix. Please see the documentation for the details. If any setting name already exists in Media Composer with the same unique ID, it will be replaced. If any setting with the same name and different ID or no ID exists, the API will fail and no settings are added. |
| LoadMobsIntoViewer | [LoadMobsIntoViewerRequest](#mcapi-LoadMobsIntoViewerRequest) | [LoadMobsIntoViewerResponse](#mcapi-LoadMobsIntoViewerResponse) | Load one or more clips or sequences into Source, Record, or Popup monitor. |
| SelectMobsInBin | [SelectMobsInBinRequest](#mcapi-SelectMobsInBinRequest) | [SelectMobsInBinResponse](#mcapi-SelectMobsInBinResponse) | Select one or more visible mobs in an open bin. |
| GetViewerMobs | [GetViewerMobsRequest](#mcapi-GetViewerMobsRequest) | [GetViewerMobsResponse](#mcapi-GetViewerMobsResponse) | Get info for which clip/sequence is loaded in the viewer |
| GetBinFromMob | [GetBinFromMobRequest](#mcapi-GetBinFromMobRequest) | [GetBinFromMobResponse](#mcapi-GetBinFromMobResponse) | Get bin apsolute path from mobID |
| AddMarker | [AddMarkerRequest](#mcapi-AddMarkerRequest) | [AddMarkerResponse](#mcapi-AddMarkerResponse) | Add new or update existing Marker information on a given track and position in the specified clip or sequence mob in an opened bin. Use ChangeMarker to change an existing marker's track or information on a given marker's guid. |
| AddMarkers | [AddMarkersRequest](#mcapi-AddMarkersRequest) | [AddMarkersResponse](#mcapi-AddMarkersResponse) | Add or update multiple Markers on a given track and position in the specified clip or sequence mob in an opened bin. |
| GetMarkers | [GetMarkersRequest](#mcapi-GetMarkersRequest) | [GetMarkersResponse](#mcapi-GetMarkersResponse) | Get all information about specified markers in clip or sequence mob |
| ChangeMarker | [ChangeMarkerRequest](#mcapi-ChangeMarkerRequest) | [ChangeMarkerResponse](#mcapi-ChangeMarkerResponse) | Change Marker information for the specified marker of the specified mob by guid. Use this API to move a marker to another track. |
| DeleteMarkers | [DeleteMarkersRequest](#mcapi-DeleteMarkersRequest) | [DeleteMarkersResponse](#mcapi-DeleteMarkersResponse) | Delete markers for a given mob_id by either an array of guids or by a combination of timecode range, MarkerColor and TrackLabel. To be clear, if a guid is provided, then it will always be deleted. WARNING: Be very careful with this API. It is very easy to permanently remove too many markers. For example, if only the mob_id is provided, then every marker for that mob in the open bin will be deleted. |
| CreateSubClip | [CreateSubClipRequest](#mcapi-CreateSubClipRequest) | [CreateSubClipResponse](#mcapi-CreateSubClipResponse) | Create subclip in bin base on clip or sequence works similar to Batch Subclip Tool |
| CloseBin | [CloseBinRequest](#mcapi-CloseBinRequest) | [CloseBinResponse](#mcapi-CloseBinResponse) | Close already opened bin |
| MoveBinItems | [MoveBinItemsRequest](#mcapi-MoveBinItemsRequest) | [MoveBinItemsResponse](#mcapi-MoveBinItemsResponse) | Move list of mobs from one to another bin |
| CopyBinItems | [CopyBinItemsRequest](#mcapi-CopyBinItemsRequest) | [CopyBinItemsResponse](#mcapi-CopyBinItemsResponse) | Copy list of mobs from one to another bin |
| DuplicateBinItems | [DuplicateBinItemsRequest](#mcapi-DuplicateBinItemsRequest) | [DuplicateBinItemsResponse](#mcapi-DuplicateBinItemsResponse) | Duplicate list of mobs in bin |
| GetListOfLinkSettings | [GetListOfLinkSettingsRequest](#mcapi-GetListOfLinkSettingsRequest) | [GetListOfLinkSettingsResponse](#mcapi-GetListOfLinkSettingsResponse) | Returns a list of available link settings |
| LinkFile | [LinkFileRequest](#mcapi-LinkFileRequest) | [LinkFileResponse](#mcapi-LinkFileResponse) | Link a file from a file path using an link-specific setting from Media Composer. Clip is added to to the specified destination bin. Returns the mobID of the resulting clip. |
| GetListOfJobQueues | [GetListOfJobQueuesRequest](#mcapi-GetListOfJobQueuesRequest) | [GetListOfJobQueuesResponse](#mcapi-GetListOfJobQueuesResponse) | Return the job queues currently available to be used by Distributed Processing (DP). |
| GetListOfCommands | [GetListOfCommandsRequest](#mcapi-GetListOfCommandsRequest) | [GetListOfCommandsResponse](#mcapi-GetListOfCommandsResponse) | Return the list if commands by name, commandId and category. Please note that the ids are only guaranteed to be valid for a given launch of Avid Media Composer. Also, commands are based on the current context of the application, i.e. current active window, selection etc. |
| DoCommand | [DoCommandRequest](#mcapi-DoCommandRequest) | [DoCommandResponse](#mcapi-DoCommandResponse) | Will start the command identified by the commandId returned from a recent call to GetListOfCommands. When the command completes, the result will be returned as a notification. |
| IsCommandsEnabled | [IsCommandsEnabledRequest](#mcapi-IsCommandsEnabledRequest) | [IsCommandsEnabledResponse](#mcapi-IsCommandsEnabledResponse) | Will return list of commands 'enable' state based on the command ids returned from a recent call to GetListOfCommands. The commands 'enable' state is also based on the current context of the application, i.e. current active window, selection etc. |
| StartPlay | [StartPlayRequest](#mcapi-StartPlayRequest) | [StartPlayResponse](#mcapi-StartPlayResponse) | Start play for the given mobid, frame offset or timecode. The mobid, if provided, must be loaded in the active monitor. If the mobid is not provided, then the active monitor will start playing at the given offset if >= 0, or the given timecode. |
| StopPlay | [StopPlayRequest](#mcapi-StopPlayRequest) | [StopPlayResponse](#mcapi-StopPlayResponse) | Signal the actively playing clip or sequence to stop. |

 <!-- end services -->



<a name="MCAPI_Types-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## MCAPI_Types.proto



<a name="mcapi-AddMarkerRequest"></a>

### AddMarkerRequest
The request of AddMarker


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [AddMarkerRequestBody](#mcapi-AddMarkerRequestBody) |  | request body |






<a name="mcapi-AddMarkerRequestBody"></a>

### AddMarkerRequestBody
The body of AddMarkerRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  |  |
| track_label | [TrackLabel](#mcapi-TrackLabel) |  | destination track for new marker. Spanned markers can only be created on the TC track. |
| offset | [int32](#int32) |  | if >= 0 this will be used for marker position, if < 0 the timecode value will be used for marker position |
| timecode | [string](#string) |  | Timeline timecode position eg. "00:00:00:00", but see offset note above. |
| length | [int32](#int32) |  | # of frames. For regular markers, use 1. Greater than 1 is used for spanned markers. |
| comment | [string](#string) |  | Marker text. |
| color | [MarkerColor](#mcapi-MarkerColor) |  | Marker color. Note that Media Composer considers the color to be indicative of priority, though users may not use color this way. |
| name | [string](#string) |  | Name of the marker. |
| guid | [string](#string) |  | Usually the string representation of a standard UUID/GUID. |
| user | [string](#string) |  | An username, optional. Usually when a user creates a marker this defaults to their OS login name, but it can be used in other ways. |
| svg_annotation | [string](#string) | optional | SVG annotation, May be displayed as an frame overlay on Marker Tool and Monitors. |






<a name="mcapi-AddMarkerResponse"></a>

### AddMarkerResponse
The response of AddMarker


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [AddMarkerResponseBody](#mcapi-AddMarkerResponseBody) |  | response body |






<a name="mcapi-AddMarkerResponseBody"></a>

### AddMarkerResponseBody
The body of AddMarkerResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| guid | [string](#string) |  | the string representation of a standard UUID/GUID for just created marker |






<a name="mcapi-AddMarkersRequest"></a>

### AddMarkersRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [AddMarkersRequestBody](#mcapi-AddMarkersRequestBody) |  | Request body |






<a name="mcapi-AddMarkersRequestBody"></a>

### AddMarkersRequestBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | mob id |
| info | [RequestMarkerInfo](#mcapi-RequestMarkerInfo) | repeated | array of marker info |






<a name="mcapi-AddMarkersResponse"></a>

### AddMarkersResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [AddMarkersResponseBody](#mcapi-AddMarkersResponseBody) |  | Response body |






<a name="mcapi-AddMarkersResponseBody"></a>

### AddMarkersResponseBody







<a name="mcapi-ChangeMarkerRequest"></a>

### ChangeMarkerRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [ChangeMarkerRequestBody](#mcapi-ChangeMarkerRequestBody) |  | Request body |






<a name="mcapi-ChangeMarkerRequestBody"></a>

### ChangeMarkerRequestBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | mob id |
| guid | [string](#string) |  | marker GUID |
| info | [ChangeMarkerRequestBody.MarkerInfo](#mcapi-ChangeMarkerRequestBody-MarkerInfo) |  | mutable marker info |
| include_svg_annotation | [bool](#bool) | optional | If true and info.svg_annotation is empty, then existing annotation will be removed. |






<a name="mcapi-ChangeMarkerRequestBody-MarkerInfo"></a>

### ChangeMarkerRequestBody.MarkerInfo



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| name | [string](#string) |  | Name of the marker. |
| comment | [string](#string) |  | Marker text. |
| color | [MarkerColor](#mcapi-MarkerColor) |  | Marker color. Note that Media Composer considers the color to be indicative of priority, though users may not use color this way. |
| track_label | [TrackLabel](#mcapi-TrackLabel) |  | Marker track type and number. Spanned markers can only be placed on the TC track. |
| user | [string](#string) |  | An username, optional. |
| svg_annotation | [string](#string) | optional | Optionally add or replace an svg annotation. |






<a name="mcapi-ChangeMarkerResponse"></a>

### ChangeMarkerResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [ChangeMarkerResponseBody](#mcapi-ChangeMarkerResponseBody) |  | Response body |






<a name="mcapi-ChangeMarkerResponseBody"></a>

### ChangeMarkerResponseBody







<a name="mcapi-CloseBinRequest"></a>

### CloseBinRequest
The request of CloseBin()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [CloseBinRequestBody](#mcapi-CloseBinRequestBody) |  | Request body |






<a name="mcapi-CloseBinRequestBody"></a>

### CloseBinRequestBody
The body of CloseBinRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| bin_path | [string](#string) |  | path can be relative to project folder or an absolute path |






<a name="mcapi-CloseBinResponse"></a>

### CloseBinResponse
The response of CloseBin()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [CloseBinResponseBody](#mcapi-CloseBinResponseBody) |  | Request body |






<a name="mcapi-CloseBinResponseBody"></a>

### CloseBinResponseBody
The body of CloseBinResponse






<a name="mcapi-ColumnInfo"></a>

### ColumnInfo
Describes the column info


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| column_name | [string](#string) |  | Column name |
| column_value | [string](#string) |  | Column value. For columns supported by menu picks, the English string will be supported. For clip color, use the format "#RRGGBB" |






<a name="mcapi-CommandError"></a>

### CommandError
Common data of the error message.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| command_error_type | [CommandErrorType](#mcapi-CommandErrorType) |  | type of the possible command error |
| command_error_message | [string](#string) |  | error or warning message |
| is_warning | [bool](#bool) |  | if error is defined as a warning, command execution should be completed successfully |






<a name="mcapi-ConfigureSRTStreamRequest"></a>

### ConfigureSRTStreamRequest
The request of ConfigureSRTStream


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [ConfigureSRTStreamRequestBody](#mcapi-ConfigureSRTStreamRequestBody) |  | Request body |






<a name="mcapi-ConfigureSRTStreamRequestBody"></a>

### ConfigureSRTStreamRequestBody
The body of ConfigureSRTStreamRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| stream_name | [string](#string) |  | Stream name |
| ip_address | [string](#string) |  | IP address |
| port | [int32](#int32) |  | Port |
| password | [string](#string) |  | Password |
| latency | [int32](#int32) |  | Latency |
| quality_option | [ConfigureSRTStreamRequestBody.QualityOption](#mcapi-ConfigureSRTStreamRequestBody-QualityOption) |  | Specifies the quality the stream should have. |
| mode_option | [ConfigureSRTStreamRequestBody.ModeOption](#mcapi-ConfigureSRTStreamRequestBody-ModeOption) |  | Specifies the mode of the stream. |
| secret_suffix | [string](#string) | optional | This is used to make a unique secret string to save or access the password with OS secure storage. |
| use_password | [bool](#bool) | optional | Off by default to be compatible with older releases. Set to true to set the password. If the password is empty, then clear the current password, if any. |






<a name="mcapi-ConfigureSRTStreamResponse"></a>

### ConfigureSRTStreamResponse
The response of ConfigureSRTStream()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [ConfigureSRTStreamResponseBody](#mcapi-ConfigureSRTStreamResponseBody) |  | Response body |






<a name="mcapi-ConfigureSRTStreamResponseBody"></a>

### ConfigureSRTStreamResponseBody
The body of ConfigureSRTStreamResponse






<a name="mcapi-CopyBinItemsRequest"></a>

### CopyBinItemsRequest
The request of CopyBinItems()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [CopyBinItemsRequestBody](#mcapi-CopyBinItemsRequestBody) |  | Request body |






<a name="mcapi-CopyBinItemsRequestBody"></a>

### CopyBinItemsRequestBody
The body of CopyBinItemsRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| source_bin_path | [string](#string) |  | path can be relative to project folder or an absolute path |
| destination_bin_path | [string](#string) |  | path can be relative to project folder or an absolute path |
| mob_id | [string](#string) | repeated | SMPTE formatted mob ID strings returned from GetListOfBinItems(). |






<a name="mcapi-CopyBinItemsResponse"></a>

### CopyBinItemsResponse
The response of CopyBinItems()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [CopyBinItemsResponseBody](#mcapi-CopyBinItemsResponseBody) |  | Request body |






<a name="mcapi-CopyBinItemsResponseBody"></a>

### CopyBinItemsResponseBody
The body of CopyBinItemsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) | repeated | Newly created mobs |






<a name="mcapi-CreateBinRequest"></a>

### CreateBinRequest
The request of CreateBin


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [CreateBinRequestBody](#mcapi-CreateBinRequestBody) |  | Request body |






<a name="mcapi-CreateBinRequestBody"></a>

### CreateBinRequestBody
The body of CreateBinRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| folder_path | [string](#string) |  | Folder path is in the currently opened project, if folder_path is empty we create at the root folder of the project |
| bin_name | [string](#string) |  | Bin name |
| option | [CreateBinRequestBody.OpenBinOption](#mcapi-CreateBinRequestBody-OpenBinOption) |  | Specifies how the bin should be opened. |






<a name="mcapi-CreateBinResponse"></a>

### CreateBinResponse
The response of CreateBin()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [CreateBinResponseBody](#mcapi-CreateBinResponseBody) |  | Response body |






<a name="mcapi-CreateBinResponseBody"></a>

### CreateBinResponseBody
The body of CreateBinResponse






<a name="mcapi-CreateClipsFromAvidMediaFilesFolderRequest"></a>

### CreateClipsFromAvidMediaFilesFolderRequest
Structure that describes CreateClipsFromAvidMediaFilesFolder request.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [CreateClipsFromAvidMediaFilesFolderRequestBody](#mcapi-CreateClipsFromAvidMediaFilesFolderRequestBody) |  | request body |






<a name="mcapi-CreateClipsFromAvidMediaFilesFolderRequestBody"></a>

### CreateClipsFromAvidMediaFilesFolderRequestBody
Structure that describes the body of CreateClipsFromAvidMediaFilesFolderRequest.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| bin_path | [string](#string) |  | Path can be relative to project folder or an absolute path. The bin must be opened. |
| media_folder_path | [string](#string) |  | within Avid media file absolute path folder. Must contain a number |
| media_file_path | [string](#string) | repeated | relative paths without ".." to media file in media folder, if empty all clips in folder will be added |






<a name="mcapi-CreateClipsFromAvidMediaFilesFolderResponse"></a>

### CreateClipsFromAvidMediaFilesFolderResponse
Structure that describes CreateClipsFromAvidMediaFilesFolder response.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [CreateClipsFromAvidMediaFilesFolderResponseBody](#mcapi-CreateClipsFromAvidMediaFilesFolderResponseBody) |  | response body |






<a name="mcapi-CreateClipsFromAvidMediaFilesFolderResponseBody"></a>

### CreateClipsFromAvidMediaFilesFolderResponseBody
Structure that describes CreateClipsFromAvidMediaFilesFolder response.






<a name="mcapi-CreateCustomColumnRequest"></a>

### CreateCustomColumnRequest
The request of CreateCustomColumn


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [CreateCustomColumnRequestBody](#mcapi-CreateCustomColumnRequestBody) |  | request body |






<a name="mcapi-CreateCustomColumnRequestBody"></a>

### CreateCustomColumnRequestBody
The body of CreateCustomColumnRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| absolute_bin_path | [string](#string) |  | The bin must be opened. |
| new_column_name | [string](#string) |  |  |
| after_column_name | [string](#string) |  | If empty or not found, new column will be at the far right. |
| column_hidden | [bool](#bool) |  | If true, new column will be hidden |






<a name="mcapi-CreateCustomColumnResponse"></a>

### CreateCustomColumnResponse
The response of CreateCustomColumn


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [CreateCustomColumnResponseBody](#mcapi-CreateCustomColumnResponseBody) |  | response body |






<a name="mcapi-CreateCustomColumnResponseBody"></a>

### CreateCustomColumnResponseBody
The body of CreateCustomColumnResponse






<a name="mcapi-CreateSubClipRequest"></a>

### CreateSubClipRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [CreateSubClipRequestBody](#mcapi-CreateSubClipRequestBody) |  | Request body |






<a name="mcapi-CreateSubClipRequestBody"></a>

### CreateSubClipRequestBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| destination_bin_path | [string](#string) |  | Path can be relative to project folder or an absolute path. |
| mob_id | [string](#string) |  | SMPTE formatted mob ID strings returned from GetListOfBinItems(). |
| track_list | [TrackList](#mcapi-TrackList) |  | If track list is empty, CreateSubClip will use all avaliable tracks. |
| use_clip_bounds | [bool](#bool) |  | This bounds can be overwritten by head_frame/end_frame, head_timecode/end_timecode. |
| use_marks_bounds | [bool](#bool) |  | This bounds can be overwritten by head_frame/end_frame, head_timecode/end_timecode. |
| head_frame | [int32](#int32) |  | Is used when head_frame >= 0, can be overwritten by head_timecode. |
| head_timecode | [string](#string) |  | Is used when is not empty. |
| end_frame | [int32](#int32) |  | Is used when end_frame >= 0, can be overwritten by end_timecode. |
| end_timecode | [string](#string) |  | Is used when is not empty. |
| add_frames_at_head | [int32](#int32) |  | Negative values can be applied to remove frames from the head. Only available frames can be added/removed |
| add_frames_at_end | [int32](#int32) |  | Negative values can be applied to remove frames from the tail. Only available frames can be added/removed |
| retain_marks | [bool](#bool) |  | Works only for sub clips. |
| retain_markers | [bool](#bool) |  | Include the clip's markers in the new subclip. |
| create_new_sequence | [bool](#bool) |  | Only for sequence. A new sequence using the newly created subclips will be added to the destination bin |
| enabled_tracks_only | [bool](#bool) |  | Only for sequence. When enabled, subclips are created based on track selection in the timeline. When disabled, all tracks in the sequence are used |






<a name="mcapi-CreateSubClipResponse"></a>

### CreateSubClipResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [CreateSubClipResponseBody](#mcapi-CreateSubClipResponseBody) |  | Request body |






<a name="mcapi-CreateSubClipResponseBody"></a>

### CreateSubClipResponseBody







<a name="mcapi-DeleteMarkersRequest"></a>

### DeleteMarkersRequest
The request of DeleteMarkers


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [DeleteMarkersRequestBody](#mcapi-DeleteMarkersRequestBody) |  | request body |






<a name="mcapi-DeleteMarkersRequestBody"></a>

### DeleteMarkersRequestBody
The body of DeleteMarkersRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | mob id |
| guid | [string](#string) | repeated | marker GUID |
| timecode_range_start | [string](#string) | optional |  |
| timecode_range_end | [string](#string) | optional |  |
| color | [MarkerColor](#mcapi-MarkerColor) | optional |  |
| track_label | [TrackLabel](#mcapi-TrackLabel) | optional |  |






<a name="mcapi-DeleteMarkersResponse"></a>

### DeleteMarkersResponse
The response of DeleteMarkers


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [DeleteMarkersResponseBody](#mcapi-DeleteMarkersResponseBody) |  | response body |






<a name="mcapi-DeleteMarkersResponseBody"></a>

### DeleteMarkersResponseBody
The body of DeleteMarkersResponse






<a name="mcapi-DoCommandRequest"></a>

### DoCommandRequest
The request of DoCommand


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [DoCommandRequestBody](#mcapi-DoCommandRequestBody) |  | request body |






<a name="mcapi-DoCommandRequestBody"></a>

### DoCommandRequestBody
The body of DoCommandRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| commandId | [int32](#int32) |  |  |






<a name="mcapi-DoCommandResponse"></a>

### DoCommandResponse
The response of DoCommand


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [DoCommandResponseBody](#mcapi-DoCommandResponseBody) |  | response body |






<a name="mcapi-DoCommandResponseBody"></a>

### DoCommandResponseBody
The body of DoCommandResponse






<a name="mcapi-DuplicateBinItemsRequest"></a>

### DuplicateBinItemsRequest
The request of DuplicateBinItems()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [DuplicateBinItemsRequestBody](#mcapi-DuplicateBinItemsRequestBody) |  | Request body |






<a name="mcapi-DuplicateBinItemsRequestBody"></a>

### DuplicateBinItemsRequestBody
The body of DuplicateBinItemsRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| bin_path | [string](#string) |  | path can be relative to project folder or an absolute path |
| mob_id | [string](#string) | repeated | SMPTE formatted mob ID strings returned from GetListOfBinItems(). |






<a name="mcapi-DuplicateBinItemsResponse"></a>

### DuplicateBinItemsResponse
The response of DuplicateBinItems()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [DuplicateBinItemsResponseBody](#mcapi-DuplicateBinItemsResponseBody) |  | Request body |






<a name="mcapi-DuplicateBinItemsResponseBody"></a>

### DuplicateBinItemsResponseBody
The body of DuplicateBinItemsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) | repeated | Newly created mobs |






<a name="mcapi-EchoRequest"></a>

### EchoRequest
The request of Echo()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [EchoRequestBody](#mcapi-EchoRequestBody) |  | Request body |






<a name="mcapi-EchoRequestBody"></a>

### EchoRequestBody
The body of EchoRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| message | [string](#string) |  | The message to be sent to the server |






<a name="mcapi-EchoResponse"></a>

### EchoResponse
The response of Echo()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [EchoResponseBody](#mcapi-EchoResponseBody) |  | Response body |






<a name="mcapi-EchoResponseBody"></a>

### EchoResponseBody
The body of EchoResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| message | [string](#string) |  | The message to be returned from the server |






<a name="mcapi-ExportEDLRequest"></a>

### ExportEDLRequest
Structure that describes ExportEDL request message.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [ExportEDLRequestBody](#mcapi-ExportEDLRequestBody) |  | request body |






<a name="mcapi-ExportEDLRequestBody"></a>

### ExportEDLRequestBody
Structure that describes the body of ExportEDLRequest.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | mobID of a sequence. |
| edl_settings_name | [string](#string) |  | Name of an already-existing EDL-specific setting from the MC List Tool. If empty or incorrect, default EDL setting is used. |
| track_list | [TrackList](#mcapi-TrackList) |  | If track list is empty, EDL will contain all sequence tracks. Only include picture, sound, and data tracks. |






<a name="mcapi-ExportEDLResponse"></a>

### ExportEDLResponse
Structure that describes ExportEDL response message.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [ExportEDLResponseBody](#mcapi-ExportEDLResponseBody) |  | response body |






<a name="mcapi-ExportEDLResponseBody"></a>

### ExportEDLResponseBody
Structure that describes ExportEDL response data.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| path | [string](#string) |  | path to a local file containing exported EDL |
| dialog_contents | [string](#string) | repeated | **Deprecated.** contents of dialogs suppressed during EDL generation, if any |






<a name="mcapi-ExportFileRequest"></a>

### ExportFileRequest
Structure that describes ExportFile request message.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [ExportFileRequestBody](#mcapi-ExportFileRequestBody) |  | request body |






<a name="mcapi-ExportFileRequestBody"></a>

### ExportFileRequestBody
Structure that describes the body of ExportFileRequest.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | mobID of a sequence. |
| file_name | [string](#string) |  | Name of file with will be created, If empty use default name. |
| export_settings_name | [string](#string) |  | Name of an already-existing export-specific setting from the MC. If empty or incorrect, default Export setting is used. |
| destination_path | [string](#string) |  | If empty, then use appropriate user's directory. |
| in_directory | [string](#string) |  | If not empty, export will create and use this named directory in the destination_path. (Mainly useful for export with multiple files) |
| option_flags | [ExportFileOption](#mcapi-ExportFileOption) | repeated |  |






<a name="mcapi-ExportFileResponse"></a>

### ExportFileResponse
Structure that describes ExportFile response message.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [ExportFileResponseBody](#mcapi-ExportFileResponseBody) |  | response body |






<a name="mcapi-ExportFileResponseBody"></a>

### ExportFileResponseBody
Structure that describes ExportFile response data.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| path | [string](#string) |  | **Deprecated.** path to a local file or subfolder containing mulitiple files. |






<a name="mcapi-FrameRate"></a>

### FrameRate
Frame rate.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| num | [int32](#int32) |  | numerator |
| den | [int32](#int32) |  | denominator |






<a name="mcapi-GetAppInfoRequest"></a>

### GetAppInfoRequest
The request of GetAppInfo()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetAppInfoRequestBody](#mcapi-GetAppInfoRequestBody) |  | Request body |






<a name="mcapi-GetAppInfoRequestBody"></a>

### GetAppInfoRequestBody
The body of GetAppInfoRequest






<a name="mcapi-GetAppInfoResponse"></a>

### GetAppInfoResponse
The response of GetAppInfo()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [GetAppInfoResponseBody](#mcapi-GetAppInfoResponseBody) |  | Request body |






<a name="mcapi-GetAppInfoResponseBody"></a>

### GetAppInfoResponseBody
The body of GetAppInfoResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| app_name | [string](#string) |  | The name of the application |
| app_version | [string](#string) |  | The version of the application |
| app_busy_status | [GetAppInfoResponseBody.AppBusyStatus](#mcapi-GetAppInfoResponseBody-AppBusyStatus) |  | The busy status of the application |
| sdk_version | [string](#string) |  | The version of panel SDK |






<a name="mcapi-GetBinColumnInfoRequest"></a>

### GetBinColumnInfoRequest
The request of GetBinColumnInfo()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetBinColumnInfoRequestBody](#mcapi-GetBinColumnInfoRequestBody) |  | Request body |






<a name="mcapi-GetBinColumnInfoRequestBody"></a>

### GetBinColumnInfoRequestBody
The body of GetBinColumnInfoRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| bin_path | [string](#string) |  | Bin path can be relative to project folder or an absolute path |






<a name="mcapi-GetBinColumnInfoResponse"></a>

### GetBinColumnInfoResponse
The response of GetBinColumnInfo()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [GetBinColumnInfoResponseBody](#mcapi-GetBinColumnInfoResponseBody) |  | Response body |






<a name="mcapi-GetBinColumnInfoResponseBody"></a>

### GetBinColumnInfoResponseBody
The body of GetBinColumnInfoResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| column | [GetBinColumnInfoResponseBody.BinColumnInfo](#mcapi-GetBinColumnInfoResponseBody-BinColumnInfo) | repeated | Contains the information of all bin columns |






<a name="mcapi-GetBinColumnInfoResponseBody-BinColumnInfo"></a>

### GetBinColumnInfoResponseBody.BinColumnInfo



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| column_name | [string](#string) |  | Bin column name |
| column_value_type | [string](#string) |  | The type of the bin column value, such as string, integer, float, etc. |
| column_hidden | [bool](#bool) |  | True if the bin column is hidden |
| column_is_custom | [bool](#bool) |  | True if the bin column is user custom column |
| column_is_readonly | [bool](#bool) |  | True if the bin column cant be modified |






<a name="mcapi-GetBinFromMobRequest"></a>

### GetBinFromMobRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetBinFromMobRequestBody](#mcapi-GetBinFromMobRequestBody) |  | Request body |






<a name="mcapi-GetBinFromMobRequestBody"></a>

### GetBinFromMobRequestBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  |  |






<a name="mcapi-GetBinFromMobResponse"></a>

### GetBinFromMobResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [GetBinFromMobResponseBody](#mcapi-GetBinFromMobResponseBody) |  | Request body |






<a name="mcapi-GetBinFromMobResponseBody"></a>

### GetBinFromMobResponseBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| absolute_path | [string](#string) |  |  |






<a name="mcapi-GetBinInfoRequest"></a>

### GetBinInfoRequest
The request of GetBinInfo()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetBinInfoRequestBody](#mcapi-GetBinInfoRequestBody) |  | Request body |






<a name="mcapi-GetBinInfoRequestBody"></a>

### GetBinInfoRequestBody
The body of GetBinInfoRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| relative_bin_path | [string](#string) |  | Bin path relative to project path |






<a name="mcapi-GetBinInfoResponse"></a>

### GetBinInfoResponse
The response of GetBinInfo


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [GetBinInfoResponseBody](#mcapi-GetBinInfoResponseBody) |  | Response body |






<a name="mcapi-GetBinInfoResponseBody"></a>

### GetBinInfoResponseBody
The body of GetBinInfoResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| lock_state | [bool](#bool) |  | True if the bin is locked |
| lock_owner | [string](#string) |  | Username of the lock's owner |
| size | [uint64](#uint64) |  | The size of the bin (unit ?) |
| is_open | [bool](#bool) |  | True if the bin was opened, false otherwise |
| background_color | [string](#string) |  | Bin's background color. In this format: '#rrggbb' |






<a name="mcapi-GetBinsRequest"></a>

### GetBinsRequest
The request of GetBins


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetBinsRequestBody](#mcapi-GetBinsRequestBody) |  | Request body |






<a name="mcapi-GetBinsRequestBody"></a>

### GetBinsRequestBody
The body of GetBinsRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| project_path | [string](#string) | optional | Project path. For performance reasons, leave empty if requesting the bins in the currently open project. |
| request_flag | [GetBinsRequestBody.GetBinsFlag](#mcapi-GetBinsRequestBody-GetBinsFlag) | repeated | Specifies which type to be returned |






<a name="mcapi-GetBinsResponse"></a>

### GetBinsResponse
The response of GetBins


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  |  |
| body | [GetBinsResponseBody](#mcapi-GetBinsResponseBody) |  |  |






<a name="mcapi-GetBinsResponseBody"></a>

### GetBinsResponseBody
The body of GetBinsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| absolute_path | [string](#string) |  | Absolute path, including name and extension |






<a name="mcapi-GetCustomProjectDataRequest"></a>

### GetCustomProjectDataRequest
The request of GetCustomProjectData


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [GetCustomProjectDataRequestBody](#mcapi-GetCustomProjectDataRequestBody) |  | request body |






<a name="mcapi-GetCustomProjectDataRequestBody"></a>

### GetCustomProjectDataRequestBody
The body of GetCustomProjectDataRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| data_id | [string](#string) |  |  |
| data_key | [string](#string) |  | Include vendor prefix from manifest file as part of the key |






<a name="mcapi-GetCustomProjectDataResponse"></a>

### GetCustomProjectDataResponse
The response of GetCustomProjectData


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [GetCustomProjectDataResponseBody](#mcapi-GetCustomProjectDataResponseBody) |  | response body |






<a name="mcapi-GetCustomProjectDataResponseBody"></a>

### GetCustomProjectDataResponseBody
The body of GetCustomProjectDataResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| data_value | [string](#string) |  | value associated with the GetCustomProjectData request's key |






<a name="mcapi-GetHostInfoRequest"></a>

### GetHostInfoRequest
The request of GetHostInfo()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetHostInfoRequestBody](#mcapi-GetHostInfoRequestBody) |  | Request body |






<a name="mcapi-GetHostInfoRequestBody"></a>

### GetHostInfoRequestBody
The body of GetHostInfoRequest






<a name="mcapi-GetHostInfoResponse"></a>

### GetHostInfoResponse
The response of GetHostInfo()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [GetHostInfoResponseBody](#mcapi-GetHostInfoResponseBody) |  | Request body |






<a name="mcapi-GetHostInfoResponseBody"></a>

### GetHostInfoResponseBody
The body of GetHostInfoResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| appl_name | [string](#string) |  | The name of application executable |
| user_name | [string](#string) |  | The username |
| workstation_name | [string](#string) |  | The name of workstation |






<a name="mcapi-GetListOfBinItemsRequest"></a>

### GetListOfBinItemsRequest
The request of GetListOfBinItems()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetListOfBinItemsRequestBody](#mcapi-GetListOfBinItemsRequestBody) |  | Request body |






<a name="mcapi-GetListOfBinItemsRequestBody"></a>

### GetListOfBinItemsRequestBody
The body of GetListOfBinItems


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| bin_relative_path | [string](#string) |  |  |
| bin_flags | [GetListOfBinItemsRequestBody.BinItemFlags](#mcapi-GetListOfBinItemsRequestBody-BinItemFlags) | repeated |  |
| only_visible_flag | [bool](#bool) |  |  |
| only_selected_flag | [bool](#bool) |  |  |






<a name="mcapi-GetListOfBinItemsResponse"></a>

### GetListOfBinItemsResponse
The response of GetListOfBinItems()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [GetListOfBinItemsResponseBody](#mcapi-GetListOfBinItemsResponseBody) |  | Response body |






<a name="mcapi-GetListOfBinItemsResponseBody"></a>

### GetListOfBinItemsResponseBody
The body of GetListOfBinItems


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_name | [string](#string) |  | The message to be returned from the server |
| mob_id | [string](#string) |  |  |
| mob_selected | [bool](#bool) |  |  |






<a name="mcapi-GetListOfCommandsRequest"></a>

### GetListOfCommandsRequest
The request of GetListOfCommands


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [GetListOfCommandsRequestBody](#mcapi-GetListOfCommandsRequestBody) |  | request body |






<a name="mcapi-GetListOfCommandsRequestBody"></a>

### GetListOfCommandsRequestBody
The body of GetListOfCommandsRequest






<a name="mcapi-GetListOfCommandsResponse"></a>

### GetListOfCommandsResponse
The response of GetListOfCommands


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [GetListOfCommandsResponseBody](#mcapi-GetListOfCommandsResponseBody) |  | response body |






<a name="mcapi-GetListOfCommandsResponseBody"></a>

### GetListOfCommandsResponseBody
The body of GetListOfCommandsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| commands | [GetListOfCommandsResponseBody.CommandInfo](#mcapi-GetListOfCommandsResponseBody-CommandInfo) | repeated |  |






<a name="mcapi-GetListOfCommandsResponseBody-CommandInfo"></a>

### GetListOfCommandsResponseBody.CommandInfo



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| name | [string](#string) |  |  |
| commandId | [int32](#int32) |  |  |
| category | [string](#string) |  |  |






<a name="mcapi-GetListOfExportEDLSettingsRequest"></a>

### GetListOfExportEDLSettingsRequest
The request of GetListOfExportEDLSettings


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [GetListOfExportEDLSettingsRequestBody](#mcapi-GetListOfExportEDLSettingsRequestBody) |  | request body |






<a name="mcapi-GetListOfExportEDLSettingsRequestBody"></a>

### GetListOfExportEDLSettingsRequestBody
The body of GetListOfExportEDLSettingsRequest






<a name="mcapi-GetListOfExportEDLSettingsResponse"></a>

### GetListOfExportEDLSettingsResponse
The response of GetListOfExportEDLSettings


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [GetListOfExportEDLSettingsResponseBody](#mcapi-GetListOfExportEDLSettingsResponseBody) |  | response body |






<a name="mcapi-GetListOfExportEDLSettingsResponseBody"></a>

### GetListOfExportEDLSettingsResponseBody
The body of GetListOfExportEDLSettingsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| setting_names | [string](#string) | repeated | List Tool EDL settings |






<a name="mcapi-GetListOfExportSettingsRequest"></a>

### GetListOfExportSettingsRequest
The request of GetListOfExportSettings


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [GetListOfExportSettingsRequestBody](#mcapi-GetListOfExportSettingsRequestBody) |  | request body |






<a name="mcapi-GetListOfExportSettingsRequestBody"></a>

### GetListOfExportSettingsRequestBody
The body of GetListOfExportSettingsRequest






<a name="mcapi-GetListOfExportSettingsResponse"></a>

### GetListOfExportSettingsResponse
The response of GetListOfExportSettings


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [GetListOfExportSettingsResponseBody](#mcapi-GetListOfExportSettingsResponseBody) |  | response body |






<a name="mcapi-GetListOfExportSettingsResponseBody"></a>

### GetListOfExportSettingsResponseBody
The body of GetListOfExportSettingsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| setting_names | [string](#string) | repeated | export settings |






<a name="mcapi-GetListOfImportSettingsRequest"></a>

### GetListOfImportSettingsRequest
The request of GetListOfImportSettings


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [GetListOfImportSettingsRequestBody](#mcapi-GetListOfImportSettingsRequestBody) |  | request body |






<a name="mcapi-GetListOfImportSettingsRequestBody"></a>

### GetListOfImportSettingsRequestBody
The body of GetListOfImportSettingsRequest






<a name="mcapi-GetListOfImportSettingsResponse"></a>

### GetListOfImportSettingsResponse
The response of GetListOfImportSettings


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [GetListOfImportSettingsResponseBody](#mcapi-GetListOfImportSettingsResponseBody) |  | response body |






<a name="mcapi-GetListOfImportSettingsResponseBody"></a>

### GetListOfImportSettingsResponseBody
The body of GetListOfImportSettingsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| setting_names | [string](#string) | repeated | import settings |






<a name="mcapi-GetListOfJobQueuesRequest"></a>

### GetListOfJobQueuesRequest
The request of GetListOfJobQueues


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [GetListOfJobQueuesRequestBody](#mcapi-GetListOfJobQueuesRequestBody) |  | request body |






<a name="mcapi-GetListOfJobQueuesRequestBody"></a>

### GetListOfJobQueuesRequestBody
The body of GetListOfJobQueuesRequest






<a name="mcapi-GetListOfJobQueuesResponse"></a>

### GetListOfJobQueuesResponse
The response of GetListOfJobQueues


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [GetListOfJobQueuesResponseBody](#mcapi-GetListOfJobQueuesResponseBody) |  | response body |






<a name="mcapi-GetListOfJobQueuesResponseBody"></a>

### GetListOfJobQueuesResponseBody
The body of GetListOfJobQueuesResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| job_queues | [GetListOfJobQueuesResponseBody.JobsQueue](#mcapi-GetListOfJobQueuesResponseBody-JobsQueue) | repeated |  |






<a name="mcapi-GetListOfJobQueuesResponseBody-JobsQueue"></a>

### GetListOfJobQueuesResponseBody.JobsQueue



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| name | [string](#string) |  |  |
| id | [string](#string) |  |  |






<a name="mcapi-GetListOfLinkSettingsRequest"></a>

### GetListOfLinkSettingsRequest
The request of GetListOfLinkSettings


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [GetListOfLinkSettingsRequestBody](#mcapi-GetListOfLinkSettingsRequestBody) |  | request body |






<a name="mcapi-GetListOfLinkSettingsRequestBody"></a>

### GetListOfLinkSettingsRequestBody
The body of GetListOfLinkSettingsRequest






<a name="mcapi-GetListOfLinkSettingsResponse"></a>

### GetListOfLinkSettingsResponse
The response of GetListOfLinkSettings


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [GetListOfLinkSettingsResponseBody](#mcapi-GetListOfLinkSettingsResponseBody) |  | response body |






<a name="mcapi-GetListOfLinkSettingsResponseBody"></a>

### GetListOfLinkSettingsResponseBody
The body of GetListOfLinkSettingsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| setting_names | [string](#string) | repeated | link settings |






<a name="mcapi-GetMarkersRequest"></a>

### GetMarkersRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetMarkersRequestBody](#mcapi-GetMarkersRequestBody) |  | Request body |






<a name="mcapi-GetMarkersRequestBody"></a>

### GetMarkersRequestBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | mob id |
| guid | [string](#string) |  | select specified marker GUID only, optional |
| offset | [GetMarkersRequestBody.offsetFilter](#mcapi-GetMarkersRequestBody-offsetFilter) |  | frame offset and length |
| timecode | [GetMarkersRequestBody.tcFilter](#mcapi-GetMarkersRequestBody-tcFilter) |  | timecode range |
| track | [TrackLabel](#mcapi-TrackLabel) |  | select markers for specified track only, optional |
| include_svg_annotation | [bool](#bool) | optional |  |






<a name="mcapi-GetMarkersRequestBody-offsetFilter"></a>

### GetMarkersRequestBody.offsetFilter



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| frame | [int32](#int32) |  |  |
| length | [int32](#int32) |  |  |






<a name="mcapi-GetMarkersRequestBody-tcFilter"></a>

### GetMarkersRequestBody.tcFilter



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| start | [string](#string) |  | starting timecode position eg. "01:00:00:00" |
| duration | [string](#string) |  | timecode duration eg. "00:00:01:00" |






<a name="mcapi-GetMarkersResponse"></a>

### GetMarkersResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [GetMarkersResponseBody](#mcapi-GetMarkersResponseBody) |  | Response body |






<a name="mcapi-GetMarkersResponseBody"></a>

### GetMarkersResponseBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| info | [ResponseMarkerInfo](#mcapi-ResponseMarkerInfo) | repeated | array of marker info |






<a name="mcapi-GetMediaVolumeItemsRequest"></a>

### GetMediaVolumeItemsRequest
The request of GetMediaVolumeItems()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetMediaVolumeItemsRequestBody](#mcapi-GetMediaVolumeItemsRequestBody) |  | Request body |






<a name="mcapi-GetMediaVolumeItemsRequestBody"></a>

### GetMediaVolumeItemsRequestBody
The body of GetMediaVolumeItemsRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| volume_name | [string](#string) |  | value returned from GetMediaVolumeList() |
| relative_path | [string](#string) |  | relative to Avid media files on the volume, use an empty string with `type == OnlyDirectories` to return the first level of media directories for the given volume name |
| type | [GetMediaVolumeItemsRequestBody.VolumeItemFilter](#mcapi-GetMediaVolumeItemsRequestBody-VolumeItemFilter) |  | volume item filter |






<a name="mcapi-GetMediaVolumeItemsResponse"></a>

### GetMediaVolumeItemsResponse
The response of GetMediaVolumeItems


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [GetMediaVolumeItemsResponseBody](#mcapi-GetMediaVolumeItemsResponseBody) |  | Response body |






<a name="mcapi-GetMediaVolumeItemsResponseBody"></a>

### GetMediaVolumeItemsResponseBody
The body of GetMediaVolumeItemsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| item | [GetMediaVolumeItemsResponseBody.MediaVolumeItem](#mcapi-GetMediaVolumeItemsResponseBody-MediaVolumeItem) | repeated |  |






<a name="mcapi-GetMediaVolumeItemsResponseBody-MediaVolumeItem"></a>

### GetMediaVolumeItemsResponseBody.MediaVolumeItem



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| relative_volume_path | [string](#string) |  | relative path from the media volume. For example: |
| is_directory | [bool](#bool) |  | true if the item is a directory, false otherwise |






<a name="mcapi-GetMediaVolumeListRequest"></a>

### GetMediaVolumeListRequest
The request of GetMediaVolumeList()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetMediaVolumeListRequestBody](#mcapi-GetMediaVolumeListRequestBody) |  | Request body |






<a name="mcapi-GetMediaVolumeListRequestBody"></a>

### GetMediaVolumeListRequestBody
The body of GetMediaVolumeListRequest






<a name="mcapi-GetMediaVolumeListResponse"></a>

### GetMediaVolumeListResponse
The response of GetMediaVolumeList


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [GetMediaVolumeListResponseBody](#mcapi-GetMediaVolumeListResponseBody) |  | Response body |






<a name="mcapi-GetMediaVolumeListResponseBody"></a>

### GetMediaVolumeListResponseBody
The body of GetMediaVolumeListResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| volumes | [GetMediaVolumeListResponseBody.MediaVolume](#mcapi-GetMediaVolumeListResponseBody-MediaVolume) | repeated | The list of Avid media files volume |






<a name="mcapi-GetMediaVolumeListResponseBody-MediaVolume"></a>

### GetMediaVolumeListResponseBody.MediaVolume
Represents Avid meida files volume.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| name | [string](#string) |  | Name of Avid media files volume |
| is_shared | [bool](#bool) |  | True if the volume resides on shared storage, false otherwise. |
| free_space | [uint64](#uint64) |  | Volume free space in KB |






<a name="mcapi-GetMobInfoRequest"></a>

### GetMobInfoRequest
The request of GetMobInfo


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetMobInfoRequestBody](#mcapi-GetMobInfoRequestBody) |  | Request body |






<a name="mcapi-GetMobInfoRequestBody"></a>

### GetMobInfoRequestBody
The body of GetMobInfoRequest. For better performance, 
set only_visible_columns to true or includes_empty_columns to false.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | SMPTE formatted mob ID string returned from GetMobContent() |
| only_visible_columns | [bool](#bool) |  | True if we only want to include visible columns |
| includes_empty_columns | [bool](#bool) |  | True if we want to also includes empty columns. |






<a name="mcapi-GetMobInfoResponse"></a>

### GetMobInfoResponse
The response of GetMobInfo


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Repsponse header |
| body | [GetMobInfoResponseBody](#mcapi-GetMobInfoResponseBody) |  | The body of GetMobInfoResponse |






<a name="mcapi-GetMobInfoResponseBody"></a>

### GetMobInfoResponseBody
Contains the information of a single column


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| column_name | [string](#string) |  | Column name |
| column_value | [string](#string) |  | Column value. For clip color, returned value will be in the format "#RRGGBB" |
| column_value_type | [string](#string) |  | The type of the column value, such as string, integer, float, etc. |
| column_hidden | [bool](#bool) |  | True if the column is hidden |
| column_is_custom | [bool](#bool) |  | True if the column is user custom column |






<a name="mcapi-GetMobTrackInfoRequest"></a>

### GetMobTrackInfoRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [GetMobTrackInfoRequestBody](#mcapi-GetMobTrackInfoRequestBody) |  | request body |






<a name="mcapi-GetMobTrackInfoRequestBody"></a>

### GetMobTrackInfoRequestBody
The body of GetMobTrackInfoRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | SMPTE formatted mob ID string returned from GetMobContent() |






<a name="mcapi-GetMobTrackInfoResponse"></a>

### GetMobTrackInfoResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [GetMobTrackInfoResponseBody](#mcapi-GetMobTrackInfoResponseBody) |  | request body |






<a name="mcapi-GetMobTrackInfoResponseBody"></a>

### GetMobTrackInfoResponseBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| track_info_list | [TrackInfoList](#mcapi-TrackInfoList) |  |  |






<a name="mcapi-GetOTSSessionStatusRequest"></a>

### GetOTSSessionStatusRequest
The request of GetOTSSessionStatus


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetOTSSessionStatusRequestBody](#mcapi-GetOTSSessionStatusRequestBody) |  | Request body |






<a name="mcapi-GetOTSSessionStatusRequestBody"></a>

### GetOTSSessionStatusRequestBody
The body of GetOTSSessionStatusRequest






<a name="mcapi-GetOTSSessionStatusResponse"></a>

### GetOTSSessionStatusResponse
The response of GetOTSSessionStatus()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [GetOTSSessionStatusResponseBody](#mcapi-GetOTSSessionStatusResponseBody) |  | Response body |






<a name="mcapi-GetOTSSessionStatusResponseBody"></a>

### GetOTSSessionStatusResponseBody
The body of GetOTSSessionStatusResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| status | [string](#string) |  | Session's status |
| session_id | [string](#string) |  | Session's id |
| creation_date | [string](#string) |  | Sessions's creation time in ISO |
| tenant_id | [string](#string) |  | Tenant id |
| stream_name | [string](#string) |  | Stream name |
| ip_address | [string](#string) |  | IP address |
| port | [int32](#int32) |  | Port |
| password | [string](#string) |  | **Deprecated.** Password |
| latency | [int32](#int32) |  | Latency |
| quality_option | [GetOTSSessionStatusResponseBody.QualityOption](#mcapi-GetOTSSessionStatusResponseBody-QualityOption) |  | Specifies the quality the stream should have. |
| mode_option | [GetOTSSessionStatusResponseBody.ModeOption](#mcapi-GetOTSSessionStatusResponseBody-ModeOption) |  | Specifies the mode of the stream. |






<a name="mcapi-GetOpenProjectInfoRequest"></a>

### GetOpenProjectInfoRequest
Represents the request of GetOpenProjectInfo


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [GetOpenProjectInfoRequestBody](#mcapi-GetOpenProjectInfoRequestBody) |  | request body |






<a name="mcapi-GetOpenProjectInfoRequestBody"></a>

### GetOpenProjectInfoRequestBody
Represents the body of GetOpenProjectInfo






<a name="mcapi-GetOpenProjectInfoResponse"></a>

### GetOpenProjectInfoResponse
The response of GetOpenProjectInfo


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [GetOpenProjectInfoResponseBody](#mcapi-GetOpenProjectInfoResponseBody) |  | response body |






<a name="mcapi-GetOpenProjectInfoResponseBody"></a>

### GetOpenProjectInfoResponseBody
The body of GetOpenProjectInfoResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| path | [string](#string) |  | full path of the project |
| project_type | [string](#string) |  | eg. 1080p/50 |
| frame_rate | [FrameRate](#mcapi-FrameRate) |  | frame rate |
| color_space | [string](#string) |  | color space |
| raster_width | [int32](#int32) |  | raster width |
| raster_height | [int32](#int32) |  | raster height |
| stereoscopic | [Stereoscopic](#mcapi-Stereoscopic) |  | stereoscopic type |
| drop_frame | [bool](#bool) |  | drop frame |
| creation_date | [Timestamp](#mcapi-Timestamp) |  | project's creation time |
| modify_date | [Timestamp](#mcapi-Timestamp) |  | project's last modified time |
| film | [bool](#bool) |  | is it a film project |
| film_perf | [string](#string) |  | film perf |






<a name="mcapi-GetSRTStreamSettingsRequest"></a>

### GetSRTStreamSettingsRequest
The request of GetSRTStreamSettings


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetSRTStreamSettingsRequestBody](#mcapi-GetSRTStreamSettingsRequestBody) |  | Request body |






<a name="mcapi-GetSRTStreamSettingsRequestBody"></a>

### GetSRTStreamSettingsRequestBody
The body of GetSRTStreamSettings






<a name="mcapi-GetSRTStreamSettingsResponse"></a>

### GetSRTStreamSettingsResponse
The response of GetSRTStreamSettings()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [GetSRTStreamSettingsResponseBody](#mcapi-GetSRTStreamSettingsResponseBody) |  | Response body |






<a name="mcapi-GetSRTStreamSettingsResponseBody"></a>

### GetSRTStreamSettingsResponseBody
The body of GetSRTStreamSettingsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| stream_name | [string](#string) |  | Stream name |
| ip_address | [string](#string) |  | IP address |
| port | [int32](#int32) |  | Port |
| password | [string](#string) |  | Password |
| latency | [int32](#int32) |  | Latency |
| quality_option | [GetSRTStreamSettingsResponseBody.QualityOption](#mcapi-GetSRTStreamSettingsResponseBody-QualityOption) |  | Specifies the quality the stream should have. |
| mode_option | [GetSRTStreamSettingsResponseBody.ModeOption](#mcapi-GetSRTStreamSettingsResponseBody-ModeOption) |  | Specifies the mode of the stream. |






<a name="mcapi-GetValuesRequest"></a>

### GetValuesRequest
The request of GetValues


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetValuesRequestBody](#mcapi-GetValuesRequestBody) |  | Request body |






<a name="mcapi-GetValuesRequestBody"></a>

### GetValuesRequestBody
The body of GetValuesRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| key | [string](#string) |  |  |
| count | [uint32](#uint32) |  |  |






<a name="mcapi-GetValuesResponse"></a>

### GetValuesResponse
The response of GetValues


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [GetValuesResponseBody](#mcapi-GetValuesResponseBody) |  | Response body |






<a name="mcapi-GetValuesResponseBody"></a>

### GetValuesResponseBody
The body of message GetValuesResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| value | [string](#string) |  |  |






<a name="mcapi-GetViewerMobsRequest"></a>

### GetViewerMobsRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [GetViewerMobsRequestBody](#mcapi-GetViewerMobsRequestBody) |  | Request body |






<a name="mcapi-GetViewerMobsRequestBody"></a>

### GetViewerMobsRequestBody







<a name="mcapi-GetViewerMobsResponse"></a>

### GetViewerMobsResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [GetViewerMobsResponseBody](#mcapi-GetViewerMobsResponseBody) |  | Request body |






<a name="mcapi-GetViewerMobsResponseBody"></a>

### GetViewerMobsResponseBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mobs | [MobInViewer](#mcapi-MobInViewer) | repeated |  |






<a name="mcapi-ImportFileRequest"></a>

### ImportFileRequest
Structure that describes ImportFile request message.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [ImportFileRequestBody](#mcapi-ImportFileRequestBody) |  | request body |






<a name="mcapi-ImportFileRequestBody"></a>

### ImportFileRequestBody
Structure that describes the body of ImportFileRequest.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| file_path | [string](#string) |  | path to file that is to be imported |
| import_settings_name | [string](#string) |  | Name of an already-existing import-specific setting from the MC. If empty or incorrect, default import setting is used. |
| destination_video_drive | [string](#string) |  | If empty, then use default Media Creation settings. |
| destination_audio_drive | [string](#string) |  | If empty, then use default Media Creation settings. |
| compression | [string](#string) |  | If empty, then use default Media Creation settings. |
| video_wrapper_format | [string](#string) |  | If empty, then use default Media Creation settings. |
| audio_wrapper_format | [string](#string) |  | If empty, then use default Media Creation settings. |
| destination_bin | [string](#string) |  | relative path to destination bin |
| option_flags | [ImportFileOption](#mcapi-ImportFileOption) | repeated |  |






<a name="mcapi-ImportFileResponse"></a>

### ImportFileResponse
Structure that describes ImportFile response message.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [ImportFileResponseBody](#mcapi-ImportFileResponseBody) |  | response body |






<a name="mcapi-ImportFileResponseBody"></a>

### ImportFileResponseBody
Structure that describes ImportFile response data.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | **Deprecated.**  |






<a name="mcapi-IsCommandsEnabledRequest"></a>

### IsCommandsEnabledRequest
The request of IsCommandsEnabled


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [IsCommandsEnabledRequestBody](#mcapi-IsCommandsEnabledRequestBody) |  | request body |






<a name="mcapi-IsCommandsEnabledRequestBody"></a>

### IsCommandsEnabledRequestBody
The body of IsCommandsEnabledRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| commandsId | [int32](#int32) | repeated |  |






<a name="mcapi-IsCommandsEnabledResponse"></a>

### IsCommandsEnabledResponse
The response of IsCommandsEnabled


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [IsCommandsEnabledResponseBody](#mcapi-IsCommandsEnabledResponseBody) |  | response body |






<a name="mcapi-IsCommandsEnabledResponseBody"></a>

### IsCommandsEnabledResponseBody
The body of IsCommandsEnabledResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| commands | [IsCommandsEnabledResponseBody.CommandEnableInfo](#mcapi-IsCommandsEnabledResponseBody-CommandEnableInfo) | repeated |  |






<a name="mcapi-IsCommandsEnabledResponseBody-CommandEnableInfo"></a>

### IsCommandsEnabledResponseBody.CommandEnableInfo



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| commandId | [int32](#int32) |  |  |
| enable | [bool](#bool) |  |  |






<a name="mcapi-LinkFileRequest"></a>

### LinkFileRequest
The request of LinkFile


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [LinkFileRequestBody](#mcapi-LinkFileRequestBody) |  | request body |






<a name="mcapi-LinkFileRequestBody"></a>

### LinkFileRequestBody
The body of LinkFileRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| file_path | [string](#string) |  | path to file that is to be link |
| destination_bin | [string](#string) |  | path can be relative to project folder or an absolute path |
| link_settings_name | [string](#string) |  | Name of an already-existing link-specific setting from the MC. If empty or incorrect, default link setting is used. |






<a name="mcapi-LinkFileResponse"></a>

### LinkFileResponse
The response of LinkFile


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [LinkFileResponseBody](#mcapi-LinkFileResponseBody) |  | response body |






<a name="mcapi-LinkFileResponseBody"></a>

### LinkFileResponseBody
The body of LinkFileResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  |  |






<a name="mcapi-LoadMobsIntoViewerRequest"></a>

### LoadMobsIntoViewerRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [LoadMobsIntoViewerRequestBody](#mcapi-LoadMobsIntoViewerRequestBody) |  | Request body |






<a name="mcapi-LoadMobsIntoViewerRequestBody"></a>

### LoadMobsIntoViewerRequestBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_ids | [string](#string) | repeated | array of mob ids to load into monitor |
| view_type | [ViewerType](#mcapi-ViewerType) |  | which monitor to load into |






<a name="mcapi-LoadMobsIntoViewerResponse"></a>

### LoadMobsIntoViewerResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [LoadMobsIntoViewerResponseBody](#mcapi-LoadMobsIntoViewerResponseBody) |  | Request body |






<a name="mcapi-LoadMobsIntoViewerResponseBody"></a>

### LoadMobsIntoViewerResponseBody







<a name="mcapi-LoadSettingRequest"></a>

### LoadSettingRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [LoadSettingRequestBody](#mcapi-LoadSettingRequestBody) |  | Request body |






<a name="mcapi-LoadSettingRequestBody"></a>

### LoadSettingRequestBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| unique_id | [string](#string) |  | A unique identifier for this set of settings. This could be a guid or any other unique string |
| xml_setting | [string](#string) |  | xml data created in Media Composer. See documentation. |






<a name="mcapi-LoadSettingResponse"></a>

### LoadSettingResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |






<a name="mcapi-MobInViewer"></a>

### MobInViewer



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  |  |
| view_type | [ViewerType](#mcapi-ViewerType) |  |  |
| current_frame | [int32](#int32) |  |  |
| current_timecode | [string](#string) |  |  |






<a name="mcapi-MoveBinItemsRequest"></a>

### MoveBinItemsRequest
The request of MoveBinItems()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [MoveBinItemsRequestBody](#mcapi-MoveBinItemsRequestBody) |  | Request body |






<a name="mcapi-MoveBinItemsRequestBody"></a>

### MoveBinItemsRequestBody
The body of MoveBinItemsRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| source_bin_path | [string](#string) |  | path can be relative to project folder or an absolute path |
| destination_bin_path | [string](#string) |  | path can be relative to project folder or an absolute path |
| mob_id | [string](#string) | repeated | SMPTE formatted mob ID strings returned from GetListOfBinItems(). |






<a name="mcapi-MoveBinItemsResponse"></a>

### MoveBinItemsResponse
The response of MoveBinItems()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [MoveBinItemsResponseBody](#mcapi-MoveBinItemsResponseBody) |  | Request body |






<a name="mcapi-MoveBinItemsResponseBody"></a>

### MoveBinItemsResponseBody
The body of MoveBinItemsResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) | repeated | Correctly moved mobs |






<a name="mcapi-OpenBinRequest"></a>

### OpenBinRequest
The request of OpenBin()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [OpenBinRequestBody](#mcapi-OpenBinRequestBody) |  | Request body |






<a name="mcapi-OpenBinRequestBody"></a>

### OpenBinRequestBody
The body of OpenBinRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| bin_path | [string](#string) |  | path can be relative to project folder or an absolute path |
| locked | [bool](#bool) |  | request for locking the bin upon opening |






<a name="mcapi-OpenBinResponse"></a>

### OpenBinResponse
The response of OpenBin()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [OpenBinResponseBody](#mcapi-OpenBinResponseBody) |  | Request body |






<a name="mcapi-OpenBinResponseBody"></a>

### OpenBinResponseBody
The body of OpenBinResponse


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| is_locked_by_other | [bool](#bool) |  | True if the bin is locked by other user, false if it is locked by you. |
| lock_owner | [string](#string) |  | The username who is holding the lock of the bin. |






<a name="mcapi-RequestHeader"></a>

### RequestHeader
Common data of request message.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| company_id | [string](#string) |  | The id of the company |
| access_token | [string](#string) |  | mcapi_access_token from cookie |






<a name="mcapi-RequestMarkerInfo"></a>

### RequestMarkerInfo



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| name | [string](#string) |  | Name of the marker. |
| track_label | [TrackLabel](#mcapi-TrackLabel) |  | destination track for new marker. Spanned markers can only be created on the TC track. |
| offset | [int32](#int32) |  | if >= 0 this will be used for marker position, if < 0 the timecode value will be used for marker position |
| timecode | [string](#string) |  | Timeline timecode position eg. "00:00:00:00", but see offset note above. |
| length | [int32](#int32) |  | # of frames. For regular markers, use 1. Greater than 1 is used for spanned markers. |
| comment | [string](#string) |  | Marker text. |
| color | [MarkerColor](#mcapi-MarkerColor) |  | Marker color. Note that Media Composer considers the color to be indicative of priority, though users may not use color this way. |
| guid | [string](#string) |  | Usually the string representation of a standard UUID/GUID, optional |
| user | [string](#string) |  | An username, optional. Usually when a user creates a marker this defaults to their OS login name, but it can be used in other ways. |
| svg_annotation | [string](#string) | optional | SVG annotation, May be displayed as an frame overlay on Marker Tool and Monitors, optional |






<a name="mcapi-ResponseHeader"></a>

### ResponseHeader
Common data of response message.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| task_id | [string](#string) |  | unique identifier for each command |
| status | [TaskStatus](#mcapi-TaskStatus) |  | **Deprecated.** status of command execution |
| progress | [int32](#int32) |  | progress of command execution in percentage |
| error | [CommandError](#mcapi-CommandError) |  | **Deprecated.** The error |
| warnings | [string](#string) | repeated | list of warnings |






<a name="mcapi-ResponseMarkerInfo"></a>

### ResponseMarkerInfo



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| name | [string](#string) |  |  |
| track_label | [TrackLabel](#mcapi-TrackLabel) |  |  |
| offset | [int32](#int32) |  |  |
| timecode | [string](#string) |  |  |
| length | [int32](#int32) |  |  |
| comment | [string](#string) |  |  |
| color | [MarkerColor](#mcapi-MarkerColor) |  |  |
| creation_date | [Timestamp](#mcapi-Timestamp) |  |  |
| guid | [string](#string) |  |  |
| user | [string](#string) |  |  |
| svg_annotation | [string](#string) | optional |  |






<a name="mcapi-ScanAvidMediaFilesFolderRequest"></a>

### ScanAvidMediaFilesFolderRequest
The request of ScanAvidMediaFilesFolder


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [ScanAvidMediaFilesFolderRequestBody](#mcapi-ScanAvidMediaFilesFolderRequestBody) |  | request body |






<a name="mcapi-ScanAvidMediaFilesFolderRequestBody"></a>

### ScanAvidMediaFilesFolderRequestBody
The body of ScanAvidMediaFilesFolderRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| destination_path | [string](#string) |  | within Avid media file path folder. Must contain a number |






<a name="mcapi-ScanAvidMediaFilesFolderResponse"></a>

### ScanAvidMediaFilesFolderResponse
The response of ScanAvidMediaFilesFolder


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [ScanAvidMediaFilesFolderResponseBody](#mcapi-ScanAvidMediaFilesFolderResponseBody) |  | response body |






<a name="mcapi-ScanAvidMediaFilesFolderResponseBody"></a>

### ScanAvidMediaFilesFolderResponseBody
The body of ScanAvidMediaFilesFolderResponse






<a name="mcapi-SelectMobsInBinRequest"></a>

### SelectMobsInBinRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [SelectMobsInBinRequestBody](#mcapi-SelectMobsInBinRequestBody) |  | Request body |






<a name="mcapi-SelectMobsInBinRequestBody"></a>

### SelectMobsInBinRequestBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| bin_path | [string](#string) |  | path can be relative to project folder or an absolute path |
| mob_ids | [string](#string) | repeated | array of mob ids to select |
| add_to_selection | [bool](#bool) |  | true - add mob id to current selection, false - clear current selection first |






<a name="mcapi-SelectMobsInBinResponse"></a>

### SelectMobsInBinResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Request header |
| body | [SelectMobsInBinResponseBody](#mcapi-SelectMobsInBinResponseBody) |  | Request body |






<a name="mcapi-SelectMobsInBinResponseBody"></a>

### SelectMobsInBinResponseBody



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| selected_mob_ids | [string](#string) | repeated | List of correctly selected mobs from request. |






<a name="mcapi-SetCustomProjectDataRequest"></a>

### SetCustomProjectDataRequest
The request of SetCustomProjectData


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | request header |
| body | [SetCustomProjectDataRequestBody](#mcapi-SetCustomProjectDataRequestBody) |  | request body |






<a name="mcapi-SetCustomProjectDataRequestBody"></a>

### SetCustomProjectDataRequestBody
The body of SetCustomProjectDataRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| data_id | [string](#string) |  |  |
| data_key | [string](#string) |  | Include vendor prefix from manifest file as part of the key |
| data_value | [string](#string) |  | the data associated with the key |






<a name="mcapi-SetCustomProjectDataResponse"></a>

### SetCustomProjectDataResponse
The response of SetCustomProjectData


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | response header |
| body | [SetCustomProjectDataResponseBody](#mcapi-SetCustomProjectDataResponseBody) |  | response body |






<a name="mcapi-SetCustomProjectDataResponseBody"></a>

### SetCustomProjectDataResponseBody
The body of SetCustomProjectDataResponse






<a name="mcapi-SetMobInfoRequest"></a>

### SetMobInfoRequest
The request of SetMobInfo()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [SetMobInfoRequestBody](#mcapi-SetMobInfoRequestBody) |  | Request body |






<a name="mcapi-SetMobInfoRequestBody"></a>

### SetMobInfoRequestBody
The body of SetMobInfoRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | SMPTE formatted mob ID strings returned from GetListOfBinItems() |
| column | [ColumnInfo](#mcapi-ColumnInfo) |  | The column to be set |






<a name="mcapi-SetMobInfoResponse"></a>

### SetMobInfoResponse
The response of SetMobInfo


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [SetMobInfoResponseBody](#mcapi-SetMobInfoResponseBody) |  | The body of SetMobInfoResponse |






<a name="mcapi-SetMobInfoResponseBody"></a>

### SetMobInfoResponseBody
Contains the information of a single column


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_failure | [SetMobInfoResponseBody.MobFailure](#mcapi-SetMobInfoResponseBody-MobFailure) | repeated | **Deprecated.**  |






<a name="mcapi-SetMobInfoResponseBody-MobFailure"></a>

### SetMobInfoResponseBody.MobFailure
Describes the detail of SetMobInfo failure


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | SMPTE formatted mob ID strings returned from GetListOfBinItems() |
| failed_columns | [ColumnInfo](#mcapi-ColumnInfo) | repeated | The columns that failed SetMobInfo |






<a name="mcapi-SetOTSSessionStatusRequest"></a>

### SetOTSSessionStatusRequest
The request of SetOTSSessionStatus


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [SetOTSSessionStatusRequestBody](#mcapi-SetOTSSessionStatusRequestBody) |  | Request body |






<a name="mcapi-SetOTSSessionStatusRequestBody"></a>

### SetOTSSessionStatusRequestBody
The body of SetOTSSessionStatusRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| status | [string](#string) |  | Session's status |
| session_id | [string](#string) |  | Session's id |
| tenant_id | [string](#string) |  | Tenant id |
| stream_name | [string](#string) |  | Stream name |
| ip_address | [string](#string) |  | IP address |
| port | [int32](#int32) |  | Port |
| password | [string](#string) |  | **Deprecated.** Password |
| latency | [int32](#int32) |  | Latency |
| quality_option | [SetOTSSessionStatusRequestBody.QualityOption](#mcapi-SetOTSSessionStatusRequestBody-QualityOption) |  | Specifies the quality the stream should have. |
| mode_option | [SetOTSSessionStatusRequestBody.ModeOption](#mcapi-SetOTSSessionStatusRequestBody-ModeOption) |  | Specifies the mode of the stream. |






<a name="mcapi-SetOTSSessionStatusResponse"></a>

### SetOTSSessionStatusResponse
The response of SetOTSSessionStatus()


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [SetOTSSessionStatusResponseBody](#mcapi-SetOTSSessionStatusResponseBody) |  | Response body |






<a name="mcapi-SetOTSSessionStatusResponseBody"></a>

### SetOTSSessionStatusResponseBody
The body of SetOTSSessionStatusResponse






<a name="mcapi-StartPlayRequest"></a>

### StartPlayRequest
The request of StartPlay


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [StartPlayRequestBody](#mcapi-StartPlayRequestBody) |  | Request body |






<a name="mcapi-StartPlayRequestBody"></a>

### StartPlayRequestBody
The body of StartPlayRequest


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| mob_id | [string](#string) |  | Mob ID to play |
| timecode | [string](#string) |  | Timecode position (e.g., "00:00:00:00") |
| offset | [int32](#int32) |  | Frame offset (if >= 0, this will be used instead of timecode) |






<a name="mcapi-StartPlayResponse"></a>

### StartPlayResponse
The response of StartPlay


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [StartPlayResponseBody](#mcapi-StartPlayResponseBody) |  | Response body |






<a name="mcapi-StartPlayResponseBody"></a>

### StartPlayResponseBody
The body of StartPlayResponse






<a name="mcapi-StopPlayRequest"></a>

### StopPlayRequest
The request of StopPlay


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [RequestHeader](#mcapi-RequestHeader) |  | Request header |
| body | [StopPlayRequestBody](#mcapi-StopPlayRequestBody) |  | Request body |






<a name="mcapi-StopPlayRequestBody"></a>

### StopPlayRequestBody
The body of StopPlayRequest






<a name="mcapi-StopPlayResponse"></a>

### StopPlayResponse
The response of StopPlay


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [ResponseHeader](#mcapi-ResponseHeader) |  | Response header |
| body | [StopPlayResponseBody](#mcapi-StopPlayResponseBody) |  | Response body |






<a name="mcapi-StopPlayResponseBody"></a>

### StopPlayResponseBody
The body of StopPlayResponse






<a name="mcapi-Timestamp"></a>

### Timestamp



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| seconds | [int64](#int64) |  | Represents seconds of UTC time since Unix epoch 1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive. |
| nanos | [int32](#int32) |  | Non-negative fractions of a second at nanosecond resolution. Negative second values with fractions must still have non-negative nanos values that count forward in time. Must be from 0 to 999,999,999 inclusive. |






<a name="mcapi-TrackInfo"></a>

### TrackInfo



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| label | [TrackLabel](#mcapi-TrackLabel) |  |  |
| custom_name | [string](#string) |  | Default for track will not ahve any custom name. |
| selected | [bool](#bool) |  |  |
| monitored | [bool](#bool) |  | Only one Video track can be monitored at a time. |
| enabled | [bool](#bool) |  | TODO: Talk to Jeff about voices and how to represent that here! |
| solo | [bool](#bool) |  |  |
| mute | [bool](#bool) |  |  |
| locked | [bool](#bool) |  |  |
| sync_locked | [bool](#bool) |  |  |
| num_segments | [int32](#int32) |  | Number of segments on the track. |
| audio_type | [AudioTrackType](#mcapi-AudioTrackType) |  |  |






<a name="mcapi-TrackInfoList"></a>

### TrackInfoList



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| track_info | [TrackInfo](#mcapi-TrackInfo) | repeated |  |






<a name="mcapi-TrackLabel"></a>

### TrackLabel



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| type | [TrackType](#mcapi-TrackType) |  |  |
| number | [uint32](#uint32) |  |  |






<a name="mcapi-TrackList"></a>

### TrackList



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| track_labels | [TrackLabel](#mcapi-TrackLabel) | repeated |  |





 <!-- end messages -->


<a name="mcapi-AudioTrackType"></a>

### AudioTrackType


| Name | Number | Description |
| ---- | ------ | ----------- |
| UNSPECIFIED_TRACK_FORMAT | 0 |  |
| MONO_AUDIO_TRACK_FORMAT | 1 |  |
| STEREO_AUDIO_TRACK_FORMAT | 2 |  |
| AUDIO_5_1_TRACK_FORMAT | 3 |  |
| AUDIO_7_1_TRACK_FORMAT | 4 |  |
| WIDEST_AUDIO_TRACK_FORMAT | 5 |  |



<a name="mcapi-CommandErrorType"></a>

### CommandErrorType
Type of the error message which can be returned to user.
It can be OS error or Media Composer error.

| Name | Number | Description |
| ---- | ------ | ----------- |
| NoError | 0 | operation succeeded or started successfully |
| OS_WritePermissions | 1 | command hits write permissions |
| OS_DirectoryPathNotFound | 2 | the specified location does not exist |
| OS_FilePathLocation | 3 | the specified file path could not be found |
| OS_DuplicateName | 4 | the session name to be created is a duplicate of some existing |
| OS_ReadError | 5 | command hits read permissions or can not read specified file |
| OS_DiskSpace | 6 | not enough free space on disk |
| OS_IllegalCharacters | 7 | the session name contains illegal characters/symbols |
| OS_CharactersLimit | 8 | the session/track name is too long (250 characters allowed) |
| OS_FileNotFound | 9 | the specified file location does not exist |
| OS_TimeOut | 10 | time out |
| OS_FileOpenFailed | 11 | the specified file could not be open |
| OS_DirectoryCannotBeCreated | 12 | The directory cannot be created |
| MC_BinNotOpened | 50 | The bin was not opened. |
| MC_FileExists | 51 | The file already exists |
| MC_DownloadFailed | 52 | The download was failed |
| MC_MobNotFound | 53 | The mod ID is not found |
| MC_BinColumnNotFound | 54 | The bin column is not found |
| MC_BinElementIsNotModifiable | 55 | The bin element is not modifiable |
| MC_ProjectDataIdIsNotValid | 56 | Custom project data Id is not valid or empty |
| MC_ProjectDatakeyIsNotValid | 57 | Custom project data key is not valid or empty |
| MC_AccessTokenIsNotValid | 58 | Access token is not valid or empty |
| MC_EDLSettingsNotFound | 59 | No EDL List Tool settings were found |
| MC_ExportSettingsNotFound | 60 | No Export settings were found |
| MC_ImportSettingsNotFound | 61 | No Import settings were found |
| MC_MissedParameter | 62 | Mandatory message parameter is empty |
| MC_ImportFileFailed | 63 | The import file was failed |
| MC_ExportFileFailed | 64 | The export file was failed |
| MC_ShutDown | 65 | The server was shut down |
| MC_InvalidArgument | 66 | Used argument is not correct |
| MC_AddMarkerFailed | 67 | Add marker finished not successfully |
| MC_ParseFileFailed | 68 | The file could not be parsed |
| MC_BinNotFound | 69 | Bin file is not found in the OS file system |
| MC_InternalError | 70 | Internal implementation error |
| MC_ProjectNotOpen | 71 | Project is not opened |
| MC_InvalidMobID | 72 | Mob ID is in incorrect format |
| MC_MediaComposerIsBusy | 73 | Media Composer is busy or modial dialog is active |
| MC_EDLComposeFailed | 74 | EDL Compose failed |
| MC_EDLDecomposeFailed | 75 | EDL Decompose failed |
| MC_EDLNotSuportedFrameRate | 76 | EDL unsupported frame rate |
| MC_BinIsLocked | 77 | Bin is locked |
| MC_LinkSettingsNotFound | 78 | No Link settings were found |
| MC_MarkerNotFound | 79 | Marker coul dnot be found |
| MC_MarkerCollision | 80 | Marker collision |
| MC_UnknownError | 1000 | Unknown error |



<a name="mcapi-ConfigureSRTStreamRequestBody-ModeOption"></a>

### ConfigureSRTStreamRequestBody.ModeOption
Specifies the type of the stream.

| Name | Number | Description |
| ---- | ------ | ----------- |
| Listener | 0 | Listener |
| Caller | 1 | Caller |



<a name="mcapi-ConfigureSRTStreamRequestBody-QualityOption"></a>

### ConfigureSRTStreamRequestBody.QualityOption
Specifies the quality the stream should have.

| Name | Number | Description |
| ---- | ------ | ----------- |
| Low | 0 | Low |
| Medium | 1 | Medium |
| High | 2 | High |



<a name="mcapi-CreateBinRequestBody-OpenBinOption"></a>

### CreateBinRequestBody.OpenBinOption
Specifies how the bin should be opened, as a floating window, or as a new tab in the active Bin Container

| Name | Number | Description |
| ---- | ------ | ----------- |
| FloatBin | 0 | Bin will be opened in a floating window |
| LastActiveBinContainer | 1 | Bin will be opened as a new tab in the last known active Bin Container |
| FollowBinSettings | 2 | Open bin according to Bin settings. |



<a name="mcapi-ExportFileOption"></a>

### ExportFileOption


| Name | Number | Description |
| ---- | ------ | ----------- |
| Export_StopIf_MixedAudio | 0 | Stop the Export if mixed audio sample rates are detected. (exported file may not be playable in other applications) |
| Export_StopIf_OfflineMedia | 1 | Stop the Export if mob contains offline media |
| Export_StopIf_UnknownFX | 2 | Stop the Export if sequence contains unloaded or unknown effects |
| Export_StopIf_LongGOP | 3 | Stop the Export if a clip contains LongGOP media. Such media is not supported for embedded export. If export continues, such media will not be added to the exported file. |
| Export_StopIf_NonNative | 4 | Stop the Export if the linked clip contains non-native media. Such media is not supported for embedded export. If export continues, such media will not be added to the exported file. |
| Export_StopIf_32kHzAudio | 5 | Stop the Export if mob contains 32kHz audio |
| Export_OMF_Audio_To_WAVE | 6 | If the OMF export setting spec for audio is not currently supported, continue export and convert audio to WAVE. |
| Export_OMF_Audio_To_AIFFC | 7 | If the OMF export setting spec for audio is not currently supported, continue export and convert audio to AIFFC. |
| Export_Conver_Audio_To_PCM | 8 | If the embedded AAF export setting for audio is not currently supported, continue export and convert audio to PCM. |
| Export_StopIf_Color_Will_Not_Seen_In_Quick_Time_Reference | 9 | If the sequence contains color correction, and it will thus not be seen in the QT reference, stop the export. |
| Export_StopIf_Cannot_Export_Mixed_Resolution_Sequence | 10 | If the AVI export setting spec uses Source Compression and it's a mixed resolution sequence, stop the export (would take long). |
| Export_Keep_Partial_Render | 11 | If export stops while rendering effects, then keep the partial render. |
| Export_StopIf_Some_Audio_Clips_Do_Not_Match_Current_Hardware_Or_Software_Sample_Rate | 12 | If audio clips that do not match HW/SW rate are present and will thus be rendered as silent, stop the export. |
| Export_StopIf_Current_Master_Fader_Format_Cannot_Accomodate_Surround_Or_7_1_Surround_Tracks | 13 | If the current master fader format cannot accomodate surround or 7.1 tracks and the master fader gain and effects will thus not be applied, stop the export. |
| Export_StopIf_Some_Clips_Dont_Have_High_Resolution_Video_Available | 14 | If some clips do not have High Resolution video, don't use proxy - stop the export. |



<a name="mcapi-GetAppInfoResponseBody-AppBusyStatus"></a>

### GetAppInfoResponseBody.AppBusyStatus
Status Media Composer app

| Name | Number | Description |
| ---- | ------ | ----------- |
| Idle | 0 | Media Composer is idle |
| Playing | 1 | Media Composer is playing |
| ModalDialog | 2 | A modal dialog is being displayed |
| Busy | 3 | Media Composer is busy (displaying spining cursor) |



<a name="mcapi-GetBinsRequestBody-GetBinsFlag"></a>

### GetBinsRequestBody.GetBinsFlag
Specifies which types to be returned

| Name | Number | Description |
| ---- | ------ | ----------- |
| AllTypes | 0 | All bin types |
| BinType | 1 | Bin |
| ScriptType | 2 | Script |
| VolumeType | 3 | Volume Bin |
| OnlyOpen | 4 |  |



<a name="mcapi-GetListOfBinItemsRequestBody-BinItemFlags"></a>

### GetListOfBinItemsRequestBody.BinItemFlags


| Name | Number | Description |
| ---- | ------ | ----------- |
| AllTypes | 0 |  |
| masterClips | 1 |  |
| linkedMasterClips | 2 |  |
| subclips | 3 |  |
| sequences | 4 |  |
| sources | 5 |  |
| effects | 6 |  |
| motionEffects | 7 |  |
| preCompsRE | 8 |  |
| preCompsTMK | 9 |  |
| groups | 10 |  |
| stereoscopicClips | 11 |  |



<a name="mcapi-GetMediaVolumeItemsRequestBody-VolumeItemFilter"></a>

### GetMediaVolumeItemsRequestBody.VolumeItemFilter
Specifies the type of Avid media files volume items returned from GetMediaVolumeItems()

| Name | Number | Description |
| ---- | ------ | ----------- |
| All | 0 | Both directories and files |
| OnlyDirectories | 1 | Directories only |
| OnlyFiles | 2 | Files only |



<a name="mcapi-GetOTSSessionStatusResponseBody-ModeOption"></a>

### GetOTSSessionStatusResponseBody.ModeOption
Specifies the type of the stream.

| Name | Number | Description |
| ---- | ------ | ----------- |
| Listener | 0 | Listener |
| Caller | 1 | Caller |



<a name="mcapi-GetOTSSessionStatusResponseBody-QualityOption"></a>

### GetOTSSessionStatusResponseBody.QualityOption
Specifies the quality the stream should have.

| Name | Number | Description |
| ---- | ------ | ----------- |
| Low | 0 | Low |
| Medium | 1 | Medium |
| High | 2 | High |



<a name="mcapi-GetSRTStreamSettingsResponseBody-ModeOption"></a>

### GetSRTStreamSettingsResponseBody.ModeOption
Specifies the type of the stream.

| Name | Number | Description |
| ---- | ------ | ----------- |
| Listener | 0 | Listener |
| Caller | 1 | Caller |



<a name="mcapi-GetSRTStreamSettingsResponseBody-QualityOption"></a>

### GetSRTStreamSettingsResponseBody.QualityOption
Specifies the quality the stream should have.

| Name | Number | Description |
| ---- | ------ | ----------- |
| Low | 0 | Low |
| Medium | 1 | Medium |
| High | 2 | High |



<a name="mcapi-ImportFileOption"></a>

### ImportFileOption


| Name | Number | Description |
| ---- | ------ | ----------- |
| Import_StopIf_Media_No_in_DB | 0 |  |



<a name="mcapi-MarkerColor"></a>

### MarkerColor
Colors of markers

| Name | Number | Description |
| ---- | ------ | ----------- |
| Red | 0 |  |
| Green | 1 |  |
| Blue | 2 |  |
| Cyan | 3 |  |
| Magenta | 4 |  |
| Yellow | 5 |  |
| Black | 6 |  |
| White | 7 |  |
| NearWhite | 8 |  |
| Pink | 9 |  |
| Forest | 10 |  |
| Denim | 11 |  |
| Violet | 12 |  |
| Purple | 13 |  |
| Orange | 14 |  |
| Grey | 15 |  |
| Gold | 16 |  |



<a name="mcapi-SetOTSSessionStatusRequestBody-ModeOption"></a>

### SetOTSSessionStatusRequestBody.ModeOption
Specifies the type of the stream.

| Name | Number | Description |
| ---- | ------ | ----------- |
| Listener | 0 | Listener |
| Caller | 1 | Caller |



<a name="mcapi-SetOTSSessionStatusRequestBody-QualityOption"></a>

### SetOTSSessionStatusRequestBody.QualityOption
Specifies the quality the stream should have.

| Name | Number | Description |
| ---- | ------ | ----------- |
| Low | 0 | Low |
| Medium | 1 | Medium |
| High | 2 | High |



<a name="mcapi-Stereoscopic"></a>

### Stereoscopic
Stereoscopic types

| Name | Number | Description |
| ---- | ------ | ----------- |
| Undef | 0 | Undefined |
| Monoscopic | 1 | Off |
| MonoLeft | 2 | Left eye only |
| MonoRight | 3 | Right eye only |
| MonoLeadingEye | 4 | Leading eye |
| HalfResX | 5 | Side by side |
| HalfResY | 6 | Over/Under |
| Full | 7 | Full |



<a name="mcapi-TaskStatus"></a>

### TaskStatus
Status of execution of the MC task.

| Name | Number | Description |
| ---- | ------ | ----------- |
| Queued | 0 | Waiting for a request to come in. |
| Pending | 1 | The request was received, waiting to be processed. |
| InProgress | 2 | The request is being processed. |
| Completed | 3 | The request was completed successfully. |
| Failed | 4 | The request was failed with a error. |
| WaitingForUserInput | 5 | need wait for user input, for example if MC license required |



<a name="mcapi-TrackType"></a>

### TrackType


| Name | Number | Description |
| ---- | ------ | ----------- |
| TRACKTYPE_PICTURE | 0 |  |
| TRACKTYPE_SOUND | 1 |  |
| TRACKTYPE_TIMECODE | 2 |  |
| TRACKTYPE_EDGECODE | 3 |  |
| TRACKTYPE_DATA | 4 |  |



<a name="mcapi-ViewerType"></a>

### ViewerType


| Name | Number | Description |
| ---- | ------ | ----------- |
| Source | 0 | can display clips or sequences |
| Record | 1 | can display only sequences |
| Popup | 2 | can display clips or sequences |
| Center | 3 | can display only sequences (returned when editor is in Color Correction mode) |


 <!-- end enums -->

 <!-- end HasExtensions -->

 <!-- end services -->



## Scalar Value Types

| .proto Type | Notes | C++ | Java | Python | Go | C# | PHP | Ruby |
| ----------- | ----- | --- | ---- | ------ | -- | -- | --- | ---- |
| <a name="double" /> double |  | double | double | float | float64 | double | float | Float |
| <a name="float" /> float |  | float | float | float | float32 | float | float | Float |
| <a name="int32" /> int32 | Uses variable-length encoding. Inefficient for encoding negative numbers – if your field is likely to have negative values, use sint32 instead. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="int64" /> int64 | Uses variable-length encoding. Inefficient for encoding negative numbers – if your field is likely to have negative values, use sint64 instead. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="uint32" /> uint32 | Uses variable-length encoding. | uint32 | int | int/long | uint32 | uint | integer | Bignum or Fixnum (as required) |
| <a name="uint64" /> uint64 | Uses variable-length encoding. | uint64 | long | int/long | uint64 | ulong | integer/string | Bignum or Fixnum (as required) |
| <a name="sint32" /> sint32 | Uses variable-length encoding. Signed int value. These more efficiently encode negative numbers than regular int32s. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="sint64" /> sint64 | Uses variable-length encoding. Signed int value. These more efficiently encode negative numbers than regular int64s. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="fixed32" /> fixed32 | Always four bytes. More efficient than uint32 if values are often greater than 2^28. | uint32 | int | int | uint32 | uint | integer | Bignum or Fixnum (as required) |
| <a name="fixed64" /> fixed64 | Always eight bytes. More efficient than uint64 if values are often greater than 2^56. | uint64 | long | int/long | uint64 | ulong | integer/string | Bignum |
| <a name="sfixed32" /> sfixed32 | Always four bytes. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="sfixed64" /> sfixed64 | Always eight bytes. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="bool" /> bool |  | bool | boolean | boolean | bool | bool | boolean | TrueClass/FalseClass |
| <a name="string" /> string | A string must always contain UTF-8 encoded or 7-bit ASCII text. | string | String | str/unicode | string | string | string | String (UTF-8) |
| <a name="bytes" /> bytes | May contain any arbitrary sequence of bytes. | string | ByteString | str | []byte | ByteString | string | String (ASCII-8BIT) |
