import { GetFileExtension, TransformFileHostUrls } from '../engine/io/fileutils.js';
import { InputFilesFromFileObjects, InputFilesFromUrls } from '../engine/import/importerfiles.js';
import { ImportErrorCode, ImportSettings } from '../engine/import/importer.js';
import { NavigationMode, ProjectionMode } from '../engine/viewer/camera.js';
import { RGBAColor } from '../engine/model/color.js';
import { Viewer } from '../engine/viewer/viewer.js';
import { AddDiv, AddDomElement, ShowDomElement, SetDomElementOuterHeight, CreateDomElement, GetDomElementOuterWidth, GetDomElementOuterHeight } from '../engine/viewer/domutils.js';
import { CalculatePopupPositionToScreen, ShowListPopup } from './dialogs.js';
import { HandleEvent } from './eventhandler.js';
import { HashHandler } from './hashhandler.js';
import { Navigator, Selection, SelectionType } from './navigator.js';
import { CameraSettings, Settings, Theme } from './settings.js';
import { Sidebar } from './sidebar.js';
import { ThemeHandler } from './themehandler.js';
import { ThreeModelLoaderUI } from './threemodelloaderui.js';
import { Toolbar } from './toolbar.js';
import { DownloadModel, ShowExportDialog } from './exportdialog.js';
import { ShowSnapshotDialog } from './snapshotdialog.js';
import { AddSvgIconElement, GetFilesFromDataTransfer, InstallTooltip, IsSmallWidth, GetMeshName } from './utils.js';
import { ShowOpenUrlDialog } from './openurldialog.js';
import { ShowSharingDialog } from './sharingdialog.js';
import { GetDefaultMaterials, ReplaceDefaultMaterialsColor } from '../engine/model/modelutils.js';
import { Direction } from '../engine/geometry/geometry.js';
import { CookieGetBoolVal, CookieSetBoolVal } from './cookiehandler.js';
import { MeasureTool } from './measuretool.js';
import { CloseAllDialogs } from './dialog.js';
import { CreateVerticalSplitter } from './splitter.js';
import { EnumeratePlugins, PluginType } from './pluginregistry.js';
import { EnvironmentSettings } from '../engine/viewer/shadingmodel.js';
import { IntersectionMode } from '../engine/viewer/viewermodel.js';
import { Loc } from '../engine/core/localization.js';

const WebsiteUIState =
{
    Undefined: 0,
    Intro: 1,
    Model: 2,
    Loading: 3
};

class WebsiteLayouter {
    constructor(parameters, navigator, sidebar, viewer, measureTool) {
        this.parameters = parameters;
        this.navigator = navigator;
        this.sidebar = sidebar;
        this.viewer = viewer;
        this.measureTool = measureTool;
        this.limits = {
            minPanelWidth: 290,
            minCanvasWidth: 100
        };
    }

    Init() {
        this.InstallSplitter(this.parameters.navigatorSplitterDiv, this.parameters.navigatorDiv, (originalWidth, xDiff) => {
            let newWidth = originalWidth - xDiff;
            this.OnSplitterDragged(newWidth - this.navigator.GetWidth(), 0);
        });

        this.InstallSplitter(this.parameters.sidebarSplitterDiv, this.parameters.sidebarDiv, (originalWidth, xDiff) => {
            let newWidth = originalWidth - xDiff;
            this.OnSplitterDragged(0, newWidth - this.sidebar.GetWidth());
        });

        this.Resize();
    }

    InstallSplitter(splitterDiv, resizedDiv, onSplit) {
        let originalWidth = null;
        CreateVerticalSplitter(splitterDiv, {
            onSplitStart: () => {
                originalWidth = GetDomElementOuterWidth(resizedDiv);
            },
            onSplit: (xDiff) => {
                onSplit(originalWidth, xDiff);
            }
        });
    }

    OnSplitterDragged(leftDiff, rightDiff) {
        let windowWidth = window.innerWidth;

        let navigatorWidth = this.navigator.GetWidth();
        let sidebarWidth = this.sidebar.GetWidth();

        let leftWidth = GetDomElementOuterWidth(this.parameters.leftContainerDiv);
        let rightWidth = GetDomElementOuterWidth(this.parameters.rightContainerDiv);

        let newLeftWidth = leftWidth + leftDiff;
        let newRightWidth = rightWidth + rightDiff;
        let contentNewWidth = windowWidth - newLeftWidth - newRightWidth;

        let isNavigatorVisible = this.navigator.IsPanelsVisible();
        let isSidebarVisible = this.sidebar.IsPanelsVisible();

        if (isNavigatorVisible && newLeftWidth < this.limits.minPanelWidth) {
            newLeftWidth = this.limits.minPanelWidth;
        }

        if (isSidebarVisible && newRightWidth < this.limits.minPanelWidth) {
            newRightWidth = this.limits.minPanelWidth;
        }

        if (contentNewWidth < this.limits.minCanvasWidth) {
            if (leftDiff > 0) {
                newLeftWidth = windowWidth - newRightWidth - this.limits.minCanvasWidth;
            } else if (rightDiff > 0) {
                newRightWidth = windowWidth - newLeftWidth - this.limits.minCanvasWidth;
            }
        }

        if (isNavigatorVisible) {
            let newNavigatorWidth = navigatorWidth + (newLeftWidth - leftWidth);
            this.navigator.SetWidth(newNavigatorWidth);
        }
        if (isSidebarVisible) {
            let newSidebarWidth = sidebarWidth + (newRightWidth - rightWidth);
            this.sidebar.SetWidth(newSidebarWidth);
        }

        this.Resize();
    }

    Resize() {
        let windowWidth = window.innerWidth;
        let windowHeight = window.innerHeight;
        let headerHeight = this.parameters.headerDiv.offsetHeight;

        let leftWidth = 0;
        let rightWidth = 0;
        let safetyMargin = 0;
        if (!IsSmallWidth()) {
            leftWidth = GetDomElementOuterWidth(this.parameters.leftContainerDiv);
            rightWidth = GetDomElementOuterWidth(this.parameters.rightContainerDiv);
            safetyMargin = 1;
        }

        let contentWidth = windowWidth - leftWidth - rightWidth;
        let contentHeight = windowHeight - headerHeight;

        if (contentWidth < this.limits.minCanvasWidth) {
            let neededIncrease = this.limits.minCanvasWidth - contentWidth;

            let isNavigatorVisible = this.navigator.IsPanelsVisible();
            let isSidebarVisible = this.sidebar.IsPanelsVisible();

            if (neededIncrease > 0 && isNavigatorVisible) {
                let navigatorDecrease = Math.min(neededIncrease, leftWidth - this.limits.minPanelWidth);
                this.navigator.SetWidth(this.navigator.GetWidth() - navigatorDecrease);
                neededIncrease = neededIncrease - navigatorDecrease;
            }

            if (neededIncrease > 0 && isSidebarVisible) {
                let sidebarDecrease = Math.min(neededIncrease, rightWidth - this.limits.minPanelWidth);
                this.sidebar.SetWidth(this.sidebar.GetWidth() - sidebarDecrease);
            }

            leftWidth = GetDomElementOuterWidth(this.parameters.leftContainerDiv);
            rightWidth = GetDomElementOuterWidth(this.parameters.rightContainerDiv);
            contentWidth = windowWidth - leftWidth - rightWidth;
        }

        this.navigator.Resize(contentHeight);
        SetDomElementOuterHeight(this.parameters.navigatorSplitterDiv, contentHeight);

        this.sidebar.Resize(contentHeight);
        SetDomElementOuterHeight(this.parameters.sidebarSplitterDiv, contentHeight);

        SetDomElementOuterHeight(this.parameters.introDiv, contentHeight);
        this.viewer.Resize(contentWidth - safetyMargin, contentHeight);

        let introContentHeight = GetDomElementOuterHeight(this.parameters.introContentDiv);
        let introContentTop = (contentHeight - introContentHeight) / 3.0;
        this.parameters.introContentDiv.style.top = introContentTop.toString() + 'px';

        this.measureTool.Resize();
    }
}

export class Website {
    constructor(parameters) {
        this.parameters = parameters;
        this.settings = new Settings(Theme.Light);
        this.cameraSettings = new CameraSettings();
        this.viewer = new Viewer();
        this.measureTool = new MeasureTool(this.viewer, this.settings);
        this.hashHandler = new HashHandler();
        this.toolbar = new Toolbar(this.parameters.toolbarDiv);
        this.navigator = new Navigator(this.parameters.navigatorDiv);
        this.sidebar = new Sidebar(this.parameters.sidebarDiv, this.settings);
        this.modelLoaderUI = new ThreeModelLoaderUI();
        this.themeHandler = new ThemeHandler();
        this.highlightColor = this.settings.highlightColor || new RGBAColor(100, 150, 255, 200);
        this.uiState = WebsiteUIState.Undefined;
        this.layouter = new WebsiteLayouter(this.parameters, this.navigator, this.sidebar, this.viewer, this.measureTool);
        this.model = null;
        this.isCtrlPressed = false;

        // Check if running in iframe and add iframe-mode class to body
        this.CheckIframeMode();
    }

    Load() {
        this.settings.LoadFromCookies();
        this.cameraSettings.LoadFromCookies();

        this.SwitchTheme(this.settings.themeId, false);
        HandleEvent('theme_on_load', this.settings.themeId === Theme.Light ? 'light' : 'dark');

        EnumeratePlugins(PluginType.Header, (plugin) => {
            plugin.registerButtons({
                createHeaderButton: (icon, title, link) => {
                    this.CreateHeaderButton(icon, title, link);
                }
            });
        });

        this.InitViewer();
        this.InitToolbar();
        this.InitDragAndDrop();
        this.InitSidebar();
        this.InitNavigator();
        this.InitCookieConsent();
        this.InitKeyboardEvents();

        this.viewer.SetMouseClickHandler(this.OnModelClicked.bind(this));
        this.viewer.SetMouseMoveHandler(this.OnModelMouseMoved.bind(this));
        this.viewer.SetContextMenuHandler(this.OnModelContextMenu.bind(this));

        this.layouter.Init();
        this.SetUIState(WebsiteUIState.Intro);

        this.hashHandler.SetEventListener(this.OnHashChange.bind(this));
        this.OnHashChange();

        // Listen for messages from parent window
        window.addEventListener('message', (event) => {
            console.log('Received message from parent:', event.data);

            if (event.data.type === 'request_selection') {
                this.SendSelectedObjectsToParent();
            } else if (event.data.type === 'set_preselected_objects') {
                console.log('Received set_preselected_objects message:', event.data.selectedObjects);
                this.SetPreselectedObjects(event.data.selectedObjects);
            } else if (event.data.type === 'check_iframe_ready') {
                console.log('Received check_iframe_ready message, checking if model is ready...');
                // Check if the model is loaded and ready
                this.CheckIframeReadyAndRespond();
            }
        });

        window.addEventListener('resize', () => {
            this.layouter.Resize();
        });
    }

    HasLoadedModel() {
        return this.model !== null;
    }

    SetUIState(uiState) {
        function ShowOnlyOnModelElements(show) {
            let root = document.querySelector(':root');
            root.style.setProperty('--ov_only_on_model_display', show ? 'inherit' : 'none');
        }

        if (this.uiState === uiState) {
            return;
        }

        console.log('SetUIState called - changing from', this.uiState, 'to', uiState);
        this.uiState = uiState;
        if (this.uiState === WebsiteUIState.Intro) {
            ShowDomElement(this.parameters.introDiv, true);
            ShowDomElement(this.parameters.headerDiv, true);
            ShowDomElement(this.parameters.mainDiv, false);
            ShowOnlyOnModelElements(false);
        } else if (this.uiState === WebsiteUIState.Model) {
            console.log('UI State changed to Model - model should be ready now');
            ShowDomElement(this.parameters.introDiv, false);
            ShowDomElement(this.parameters.headerDiv, true);
            ShowDomElement(this.parameters.mainDiv, true);
            ShowOnlyOnModelElements(true);
            this.UpdatePanelsVisibility();
        } else if (this.uiState === WebsiteUIState.Loading) {
            ShowDomElement(this.parameters.introDiv, false);
            ShowDomElement(this.parameters.headerDiv, true);
            ShowDomElement(this.parameters.mainDiv, false);
            ShowOnlyOnModelElements(false);
        }

        this.layouter.Resize();
    }

    ClearModel() {
        CloseAllDialogs();

        this.model = null;
        this.viewer.Clear();

        this.parameters.fileNameDiv.innerHTML = '';

        this.navigator.Clear();
        this.sidebar.Clear();

        this.measureTool.SetActive(false);
    }

    OnModelLoaded(importResult, threeObject) {
        console.log('OnModelLoaded called - setting model and UI state');
        this.model = importResult.model;
        this.parameters.fileNameDiv.innerHTML = importResult.mainFile;
        this.viewer.SetMainObject(threeObject);
        this.viewer.SetUpVector(Direction.Y, false);
        this.navigator.FillTree(importResult);
        this.sidebar.UpdateControlsVisibility();
        this.FitModelToWindow(true);

        // Apply URL parameters after model is loaded
        this.ApplyUrlParameters();

        // Notify parent window that model is ready (if in iframe)
        if (window.self !== window.top) {
            console.log('Sending iframe_ready message from OnModelLoaded');
            window.parent.postMessage({
                type: 'iframe_ready',
                status: 'ready'
            }, '*');
        }
    }

    ApplyUrlParameters() {
        // Apply opacity from URL
        let urlOpacity = this.hashHandler.GetOpacityFromHash();
        if (urlOpacity !== null) {
            this.settings.globalOpacity = urlOpacity;
            this.settings.SaveToCookies();
            // Update the opacity slider in the settings panel
            if (this.sidebar.settingsPanel && this.sidebar.settingsPanel.opacitySlider) {
                this.sidebar.settingsPanel.opacitySlider.value = Math.round(this.settings.globalOpacity * 100);
                this.sidebar.settingsPanel.opacitySliderValue.innerHTML = Math.round(this.settings.globalOpacity * 100) + '%';
            }
        }

        // Apply selected objects from URL
        let selectedObjects = this.hashHandler.GetSelectedObjectsFromHash();

        if (selectedObjects && selectedObjects.length > 0) {
            // Find mesh IDs to select
            let meshIdsToSelect = [];
            this.viewer.EnumerateMeshesAndLinesUserData((meshUserData) => {
                let objectName = 'Unknown';

                // Try to get the proper mesh name using the model
                if (this.model) {
                    try {
                        // Get the mesh instance from the model using the mesh ID
                        let meshInstance = this.model.GetMeshInstance(meshUserData.originalMeshInstance.id);
                        if (meshInstance) {
                            // Get the node and mesh names like the navigator does
                            let nodeName = meshInstance.node.GetName();
                            let meshName = meshInstance.mesh.GetName();

                            // Use the GetMeshName function like the navigator
                            objectName = GetMeshName(nodeName, meshName);
                        }
                    } catch (error) {
                        console.log('Error getting mesh instance for URL selection:', error);
                    }
                }

                if (selectedObjects.includes(objectName)) {
                    meshIdsToSelect.push(meshUserData.originalMeshInstance.id);
                }
            });

            if (meshIdsToSelect.length > 0) {
                // Create Selection objects for each mesh ID
                let selections = meshIdsToSelect.map(meshId => {
                    let selection = new Selection(SelectionType.Mesh, meshId);
                    return selection;
                });
                this.navigator.SetMultipleSelections(selections);
            }
        }

        // Update the display
        this.UpdateMeshesSelection();

        // Apply pending preselected objects from postMessage (if any)
        if (this.pendingPreselectedObjects) {
            console.log('Applying pending preselected objects:', this.pendingPreselectedObjects);
            this.SetPreselectedObjects(this.pendingPreselectedObjects);
            this.pendingPreselectedObjects = null;
        }
    }

    OnModelClicked(button, mouseCoordinates, event) {
        if (button !== 1) {
            return;
        }

        if (this.measureTool.IsActive()) {
            this.measureTool.Click(mouseCoordinates);
            return;
        }

        // Check if Ctrl key is pressed using multiple methods for better reliability
        let isCtrlPressed = false;
        if (event) {
            isCtrlPressed = event.ctrlKey || event.metaKey || this.isCtrlPressed;
        } else {
            isCtrlPressed = this.isCtrlPressed;
        }

        let meshUserData = this.viewer.GetMeshUserDataUnderMouse(IntersectionMode.MeshAndLine, mouseCoordinates);
        if (meshUserData === null) {
            // Only clear selection if not holding Ctrl (no multiple selection)
            if (!isCtrlPressed) {
                this.navigator.SetSelection(null);
            }
        } else {
            let meshSelection = new Selection(SelectionType.Mesh, meshUserData.originalMeshInstance.id);
            if (isCtrlPressed) {
                // Ctrl+Click for multiple selection
                this.navigator.ToggleSelection(meshSelection);
            } else {
                // Single click for single selection
                this.navigator.SetSelection(meshSelection);
            }
        }
    }

    OnModelMouseMoved(mouseCoordinates) {
        if (this.measureTool.IsActive()) {
            this.measureTool.MouseMove(mouseCoordinates);
        }
    }

    OnModelContextMenu(globalMouseCoordinates, mouseCoordinates) {
        let meshUserData = this.viewer.GetMeshUserDataUnderMouse(IntersectionMode.MeshAndLine, mouseCoordinates);
        let items = [];
        if (meshUserData === null) {
            items.push({
                name: Loc('Fit model to window'),
                icon: 'fit',
                onClick: () => {
                    this.FitModelToWindow(false);
                }
            });
            if (this.navigator.HasHiddenMesh()) {
                items.push({
                    name: Loc('Show all meshes') + ' (Shift+H)',
                    icon: 'visible',
                    onClick: () => {
                        this.navigator.ShowAllMeshes(true);
                    }
                });
            }
        } else {
            // Check if multiple meshes are selected
            let selectedMeshIds = this.navigator.GetSelectedMeshIds();
            let isMultipleSelection = selectedMeshIds.length > 1;

            if (isMultipleSelection) {
                // Multiple meshes selected - add multiple selection options
                items.push({
                    name: Loc('Hide all selected Meshes') + ' (H)',
                    icon: 'hidden',
                    onClick: () => {
                        for (let meshId of selectedMeshIds) {
                            this.navigator.ToggleMeshVisibility(meshId);
                        }
                    }
                });
                items.push({
                    name: Loc('Fit all selected Meshes to window'),
                    icon: 'fit',
                    onClick: () => {
                        let meshIdSet = new Set(selectedMeshIds);
                        this.FitMeshesToWindow(meshIdSet);
                    }
                });
            } else {
                // Single mesh selected - show individual options
                items.push({
                    name: Loc('Hide mesh') + ' (H)',
                    icon: 'hidden',
                    onClick: () => {
                        this.navigator.ToggleMeshVisibility(meshUserData.originalMeshInstance.id);
                    }
                });
            }

            items.push({
                name: Loc('Fit mesh to window'),
                icon: 'fit',
                onClick: () => {
                    this.navigator.FitMeshToWindow(meshUserData.originalMeshInstance.id);
                }
            });

            if (this.navigator.MeshItemCount() > 1) {
                let isMeshIsolated = this.navigator.IsMeshIsolated(meshUserData.originalMeshInstance.id);
                items.push({
                    name: isMeshIsolated ? Loc('Remove isolation') : Loc('Isolate mesh'),
                    icon: isMeshIsolated ? 'deisolate' : 'isolate',
                    onClick: () => {
                        if (isMeshIsolated) {
                            this.navigator.ShowAllMeshes(true);
                        } else {
                            this.navigator.IsolateMesh(meshUserData.originalMeshInstance.id);
                        }
                    }
                });
            }
        }
        ShowListPopup(items, {
            calculatePosition: (contentDiv) => {
                return CalculatePopupPositionToScreen(globalMouseCoordinates, contentDiv);
            },
            onClick: (index) => {
                let clickedItem = items[index];
                clickedItem.onClick();
            }
        });
    }

    OnHashChange() {
        if (this.hashHandler.HasHash()) {
            let urls = this.hashHandler.GetModelFilesFromHash();
            if (urls === null) {
                return;
            }
            TransformFileHostUrls(urls);
            let importSettings = new ImportSettings();
            importSettings.defaultLineColor = this.settings.defaultLineColor;
            importSettings.defaultColor = this.settings.defaultColor;
            let defaultColor = this.hashHandler.GetDefaultColorFromHash();
            if (defaultColor !== null) {
                importSettings.defaultColor = defaultColor;
            }
            HandleEvent('model_load_started', 'hash');
            this.LoadModelFromUrlList(urls, importSettings);
        } else {
            this.ClearModel();
            this.SetUIState(WebsiteUIState.Intro);
        }
    }

    OpenFileBrowserDialog() {
        this.parameters.fileInput.click();
    }

    FitModelToWindow(onLoad) {
        let animation = !onLoad;
        let boundingSphere = this.viewer.GetBoundingSphere((meshUserData) => {
            return this.navigator.IsMeshVisible(meshUserData.originalMeshInstance.id);
        });
        if (onLoad) {
            this.viewer.AdjustClippingPlanesToSphere(boundingSphere);
        }
        this.viewer.FitSphereToWindow(boundingSphere, animation);
    }

    FitMeshToWindow(meshInstanceId) {
        let boundingSphere = this.viewer.GetBoundingSphere((meshUserData) => {
            return meshUserData.originalMeshInstance.id.IsEqual(meshInstanceId);
        });
        this.viewer.FitSphereToWindow(boundingSphere, true);
    }

    FitMeshesToWindow(meshInstanceIdSet) {
        let meshInstanceIdKeys = new Set();
        for (let meshInstanceId of meshInstanceIdSet) {
            meshInstanceIdKeys.add(meshInstanceId.GetKey());
        }
        let boundingSphere = this.viewer.GetBoundingSphere((meshUserData) => {
            return meshInstanceIdKeys.has(meshUserData.originalMeshInstance.id.GetKey());
        });
        this.viewer.FitSphereToWindow(boundingSphere, true);
    }

    UpdateMeshesVisibility() {
        this.viewer.SetMeshesVisibility((meshUserData) => {
            return this.navigator.IsMeshVisible(meshUserData.originalMeshInstance.id);
        });


    }

    UpdateMeshesSelection() {
        let selectedMeshIds = this.navigator.GetSelectedMeshIds();

        if (selectedMeshIds.length === 0) {
            this.viewer.SetMeshesHighlight(null, () => false);
        } else {
            this.viewer.SetMeshesHighlight(this.highlightColor, (meshUserData) => {
                return selectedMeshIds.some(meshId =>
                    meshId.GetKey() === meshUserData.originalMeshInstance.id.GetKey()
                );
            });
        }

        // Send selected objects to parent window if in iframe
        this.SendSelectedObjectsToParent();

        // Don't update URL automatically to prevent page refresh
        // this.UpdateUrlWithSelections();
    }

    SendSelectedObjectsToParent() {
        // Check if we're in an iframe
        if (window.self !== window.top) {
            let selectedMeshIds = this.navigator.GetSelectedMeshIds();
            let selectedObjectNames = [];

            // Convert mesh IDs to object names
            this.viewer.EnumerateMeshesAndLinesUserData((meshUserData) => {
                if (selectedMeshIds.some(meshId => meshId.GetKey() === meshUserData.originalMeshInstance.id.GetKey())) {
                    let objectName = 'Unknown';

                    // Try to get the proper mesh name using the model
                    if (this.model) {
                        try {
                            // Get the mesh instance from the model using the mesh ID
                            let meshInstance = this.model.GetMeshInstance(meshUserData.originalMeshInstance.id);
                            if (meshInstance) {
                                // Get the node and mesh names like the navigator does
                                let nodeName = meshInstance.node.GetName();
                                let meshName = meshInstance.mesh.GetName();

                                // Use the GetMeshName function like the navigator
                                objectName = GetMeshName(nodeName, meshName);
                            }
                        } catch (error) {
                            console.log('Error getting mesh instance for parent message:', error);
                        }
                    }

                    selectedObjectNames.push(objectName);
                }
            });

            // Send message to parent window
            window.parent.postMessage({
                type: '3dviewer_selection_changed',
                selectedObjects: selectedObjectNames,
                selectedCount: selectedObjectNames.length
            }, '*');
        }
    }

    SetPreselectedObjects(selectedObjectNames) {
        console.log('SetPreselectedObjects called with:', selectedObjectNames);

        if (!selectedObjectNames || selectedObjectNames.length === 0) {
            console.log('No objects to preselect');
            return;
        }

        if (!this.model) {
            console.log('Model not loaded yet, storing preselected objects for later');
            // Store for later when model loads
            this.pendingPreselectedObjects = selectedObjectNames;
            return;
        }

        // Find mesh IDs to select
        let meshIdsToSelect = [];
        let foundObjects = [];

        this.viewer.EnumerateMeshesAndLinesUserData((meshUserData) => {
            let objectName = 'Unknown';

            // Try to get the proper mesh name using the model
            try {
                // Get the mesh instance from the model using the mesh ID
                let meshInstance = this.model.GetMeshInstance(meshUserData.originalMeshInstance.id);
                if (meshInstance) {
                    // Get the node and mesh names like the navigator does
                    let nodeName = meshInstance.node.GetName();
                    let meshName = meshInstance.mesh.GetName();

                    // Use the GetMeshName function like the navigator
                    objectName = GetMeshName(nodeName, meshName);
                }
            } catch (error) {
                console.log('Error getting mesh instance for preselection:', error);
            }

            if (selectedObjectNames.includes(objectName)) {
                meshIdsToSelect.push(meshUserData.originalMeshInstance.id);
                foundObjects.push(objectName);
            }
        });

        console.log('Found objects in model:', foundObjects);
        console.log('Mesh IDs to select:', meshIdsToSelect.length);

        if (meshIdsToSelect.length > 0) {
            // Create Selection objects for each mesh ID
            let selections = meshIdsToSelect.map(meshId => {
                let selection = new Selection(SelectionType.Mesh, meshId);
                return selection;
            });
            this.navigator.SetMultipleSelections(selections);

            // Update the display
            this.UpdateMeshesSelection();

            console.log(`Successfully preselected ${selections.length} objects:`, foundObjects);
        } else {
            console.log('No matching objects found in the model');
        }
    }

    UpdateUrlWithSelections() {
        let selectedMeshIds = this.navigator.GetSelectedMeshIds();

        let selectedObjectNames = [];

        // Convert mesh IDs to object names for URL
        this.viewer.EnumerateMeshesAndLinesUserData((meshUserData) => {
            if (selectedMeshIds.some(meshId => meshId.GetKey() === meshUserData.originalMeshInstance.id.GetKey())) {
                let objectName = 'Unknown';

                // Try to get the proper mesh name using the model
                if (this.model) {
                    try {
                        // Get the mesh instance from the model using the mesh ID
                        let meshInstance = this.model.GetMeshInstance(meshUserData.originalMeshInstance.id);
                        if (meshInstance) {
                            // Get the node and mesh names like the navigator does
                            let nodeName = meshInstance.node.GetName();
                            let meshName = meshInstance.mesh.GetName();

                            // Use the GetMeshName function like the navigator
                            objectName = GetMeshName(nodeName, meshName);
                        }
                    } catch (error) {
                        console.log('Error getting mesh instance for URL update:', error);
                    }
                }

                selectedObjectNames.push(objectName);
            }
        });

        // Update URL with selected objects and opacity
        this.hashHandler.SetSelectedObjectsToHash(selectedObjectNames);
        this.hashHandler.SetOpacityToHash(this.settings.globalOpacity);
    }

    UpdateUrlManually() {
        this.UpdateUrlWithSelections();
    }

    UpdateMeshesOpacity() {
        // Opacity functionality removed - keeping method signature for compatibility
    }

    LoadModelFromUrlList(urls, settings) {
        let inputFiles = InputFilesFromUrls(urls);
        this.LoadModelFromInputFiles(inputFiles, settings);
        this.ClearHashIfNotOnlyUrlList();
    }

    LoadModelFromFileList(files) {
        let importSettings = new ImportSettings();
        importSettings.defaultLineColor = this.settings.defaultLineColor;
        importSettings.defaultColor = this.settings.defaultColor;
        let inputFiles = InputFilesFromFileObjects(files);
        this.LoadModelFromInputFiles(inputFiles, importSettings);
        this.ClearHashIfNotOnlyUrlList();
    }

    LoadModelFromInputFiles(files, settings) {
        this.modelLoaderUI.LoadModel(files, settings, {
            onStart: () => {
                this.SetUIState(WebsiteUIState.Loading);
                this.ClearModel();
            },
            onFinish: (importResult, threeObject) => {
                this.SetUIState(WebsiteUIState.Model);
                this.OnModelLoaded(importResult, threeObject);
                let importedExtension = GetFileExtension(importResult.mainFile);
                HandleEvent('model_loaded', importedExtension);
            },
            onRender: () => {
                this.viewer.Render();
            },
            onError: (importError) => {
                this.SetUIState(WebsiteUIState.Intro);
                let extensionStr = null;
                if (importError.mainFile !== null) {
                    extensionStr = GetFileExtension(importError.mainFile);
                } else {
                    let extensions = [];
                    let importer = this.modelLoaderUI.GetImporter();
                    let fileList = importer.GetFileList().GetFiles();
                    for (let i = 0; i < fileList.length; i++) {
                        let extension = fileList[i].extension;
                        extensions.push(extension);
                    }
                    extensionStr = extensions.join(',');
                }
                if (importError.code === ImportErrorCode.NoImportableFile) {
                    HandleEvent('no_importable_file', extensionStr);
                } else if (importError.code === ImportErrorCode.FailedToLoadFile) {
                    HandleEvent('failed_to_load_file', extensionStr);
                } else if (importError.code === ImportErrorCode.ImportFailed) {
                    HandleEvent('import_failed', extensionStr, {
                        error_message: importError.message
                    });
                }
            }
        });
    }

    ClearHashIfNotOnlyUrlList() {
        let importer = this.modelLoaderUI.GetImporter();
        let isOnlyUrl = importer.GetFileList().IsOnlyUrlSource();
        if (!isOnlyUrl && this.hashHandler.HasHash()) {
            this.hashHandler.SkipNextEventHandler();
            this.hashHandler.ClearHash();
        }
    }

    UpdateEdgeDisplay() {
        this.settings.SaveToCookies();
        this.viewer.SetEdgeSettings(this.settings.edgeSettings);
    }

    UpdateEnvironmentMap() {
        let envMapPath = 'assets/envmaps/' + this.settings.environmentMapName + '/';
        let envMapTextures = [
            envMapPath + 'posx.jpg',
            envMapPath + 'negx.jpg',
            envMapPath + 'posy.jpg',
            envMapPath + 'negy.jpg',
            envMapPath + 'posz.jpg',
            envMapPath + 'negz.jpg'
        ];
        let environmentSettings = new EnvironmentSettings(envMapTextures, this.settings.backgroundIsEnvMap);
        this.viewer.SetEnvironmentMapSettings(environmentSettings);
    }

    SwitchTheme(newThemeId, resetColors) {
        this.settings.themeId = newThemeId;
        this.themeHandler.SwitchTheme(this.settings.themeId);
        if (resetColors) {
            let defaultSettings = new Settings(this.settings.themeId);
            this.settings.backgroundColor = defaultSettings.backgroundColor;
            this.settings.defaultLineColor = defaultSettings.defaultLineColor;
            this.settings.defaultColor = defaultSettings.defaultColor;
            this.sidebar.UpdateControlsStatus();

            this.viewer.SetBackgroundColor(this.settings.backgroundColor);
            let modelLoader = this.modelLoaderUI.GetModelLoader();
            if (modelLoader.GetDefaultMaterials() !== null) {
                ReplaceDefaultMaterialsColor(this.model, this.settings.defaultColor, this.settings.defaultLineColor);
                modelLoader.ReplaceDefaultMaterialsColor(this.settings.defaultColor, this.settings.defaultLineColor);
            }
        }

        this.settings.SaveToCookies();
    }

    InitViewer() {
        let canvas = AddDomElement(this.parameters.viewerDiv, 'canvas');
        this.viewer.Init(canvas);
        this.viewer.SetEdgeSettings(this.settings.edgeSettings);
        this.viewer.SetBackgroundColor(this.settings.backgroundColor);
        this.viewer.SetNavigationMode(this.cameraSettings.navigationMode);
        this.viewer.SetProjectionMode(this.cameraSettings.projectionMode);
        this.UpdateEnvironmentMap();
    }

    InitToolbar() {
        function AddButton(toolbar, imageName, imageTitle, classNames, onClick) {
            let button = toolbar.AddImageButton(imageName, imageTitle, () => {
                onClick();
            });
            for (let className of classNames) {
                button.AddClass(className);
            }
            return button;
        }

        function AddPushButton(toolbar, imageName, imageTitle, classNames, onClick) {
            let button = toolbar.AddImagePushButton(imageName, imageTitle, false, (isSelected) => {
                onClick(isSelected);
            });
            for (let className of classNames) {
                button.AddClass(className);
            }
            return button;
        }

        function AddRadioButton(toolbar, imageNames, imageTitles, selectedIndex, classNames, onClick) {
            let imageData = [];
            for (let i = 0; i < imageNames.length; i++) {
                let imageName = imageNames[i];
                let imageTitle = imageTitles[i];
                imageData.push({
                    image: imageName,
                    title: imageTitle
                });
            }
            let buttons = toolbar.AddImageRadioButton(imageData, selectedIndex, (buttonIndex) => {
                onClick(buttonIndex);
            });
            for (let className of classNames) {
                for (let button of buttons) {
                    button.AddClass(className);
                }
            }
        }

        function AddSeparator(toolbar, classNames) {
            let separator = toolbar.AddSeparator();
            if (classNames !== null) {
                for (let className of classNames) {
                    separator.classList.add(className);
                }
            }
        }

        let importer = this.modelLoaderUI.GetImporter();
        let navigationModeIndex = (this.cameraSettings.navigationMode === NavigationMode.FixedUpVector ? 0 : 1);
        let projectionModeIndex = (this.cameraSettings.projectionMode === ProjectionMode.Perspective ? 0 : 1);

        AddButton(this.toolbar, 'open', Loc('Open from your device'), [], () => {
            this.OpenFileBrowserDialog();
        });
        AddButton(this.toolbar, 'open_url', Loc('Open from url'), [], () => {
            ShowOpenUrlDialog((urls) => {
                if (urls.length > 0) {
                    this.hashHandler.SetModelFilesToHash(urls);
                }
            });
        });
        AddSeparator(this.toolbar, ['only_on_model']);
        AddButton(this.toolbar, 'fit', Loc('Fit model to window'), ['only_on_model'], () => {
            this.FitModelToWindow(false);
        });
        AddButton(this.toolbar, 'close', Loc('Clear all selection') + ' (Esc)', ['only_on_model'], () => {
            this.navigator.SetSelection(null);
        });
        AddButton(this.toolbar, 'up_y', Loc('Set Y axis as up vector'), ['only_on_model'], () => {
            this.viewer.SetUpVector(Direction.Y, true);
        });
        AddButton(this.toolbar, 'up_z', Loc('Set Z axis as up vector'), ['only_on_model'], () => {
            this.viewer.SetUpVector(Direction.Z, true);
        });
        AddButton(this.toolbar, 'flip', Loc('Flip up vector'), ['only_on_model'], () => {
            this.viewer.FlipUpVector();
        });
        AddSeparator(this.toolbar, ['only_full_width', 'only_on_model']);
        AddRadioButton(this.toolbar, ['fix_up_on', 'fix_up_off'], [Loc('Fixed up vector'), Loc('Free orbit')], navigationModeIndex, ['only_full_width', 'only_on_model'], (buttonIndex) => {
            if (buttonIndex === 0) {
                this.cameraSettings.navigationMode = NavigationMode.FixedUpVector;
            } else if (buttonIndex === 1) {
                this.cameraSettings.navigationMode = NavigationMode.FreeOrbit;
            }
            this.cameraSettings.SaveToCookies();
            this.viewer.SetNavigationMode(this.cameraSettings.navigationMode);
        });
        AddSeparator(this.toolbar, ['only_full_width', 'only_on_model']);
        AddRadioButton(this.toolbar, ['camera_perspective', 'camera_orthographic'], [Loc('Perspective camera'), Loc('Orthographic camera')], projectionModeIndex, ['only_full_width', 'only_on_model'], (buttonIndex) => {
            if (buttonIndex === 0) {
                this.cameraSettings.projectionMode = ProjectionMode.Perspective;
            } else if (buttonIndex === 1) {
                this.cameraSettings.projectionMode = ProjectionMode.Orthographic;
            }
            this.cameraSettings.SaveToCookies();
            this.viewer.SetProjectionMode(this.cameraSettings.projectionMode);
            this.sidebar.UpdateControlsVisibility();
        });
        AddSeparator(this.toolbar, ['only_full_width', 'only_on_model']);
        let measureToolButton = AddPushButton(this.toolbar, 'measure', Loc('Measure'), ['only_full_width', 'only_on_model'], (isSelected) => {
            HandleEvent('measure_tool_activated', isSelected ? 'on' : 'off');
            this.navigator.SetSelection(null);
            this.measureTool.SetActive(isSelected);
        });
        this.measureTool.SetButton(measureToolButton);
        AddSeparator(this.toolbar, ['only_full_width', 'only_on_model']);
        AddButton(this.toolbar, 'download', Loc('Download'), ['only_full_width', 'only_on_model'], () => {
            HandleEvent('model_downloaded', '');
            let importer = this.modelLoaderUI.GetImporter();
            DownloadModel(importer);
        });
        AddButton(this.toolbar, 'export', Loc('Export'), ['only_full_width', 'only_on_model'], () => {
            ShowExportDialog(this.model, this.viewer, {
                isMeshVisible: (meshInstanceId) => {
                    return this.navigator.IsMeshVisible(meshInstanceId);
                }
            });
        });
        AddButton(this.toolbar, 'share', Loc('Share'), ['only_full_width', 'only_on_model'], () => {
            ShowSharingDialog(importer.GetFileList(), this.settings, this.viewer);
        });
        AddSeparator(this.toolbar, ['only_full_width', 'only_on_model']);
        AddButton(this.toolbar, 'snapshot', Loc('Create snapshot'), ['only_full_width', 'only_on_model'], () => {
            ShowSnapshotDialog(this.viewer);
        });
        AddButton(this.toolbar, 'open_url', 'Update URL', ['only_full_width', 'only_on_model'], () => {
            this.UpdateUrlManually();
        });
        AddButton(this.toolbar, 'share', 'Send Selection to Parent', ['only_full_width', 'only_on_model'], () => {
            this.SendSelectedObjectsToParent();
        });



        EnumeratePlugins(PluginType.Toolbar, (plugin) => {
            plugin.registerButtons({
                createSeparator: (classNames) => {
                    AddSeparator(this.toolbar, classNames);
                },
                createButton: (icon, title, classNames, onClick) => {
                    AddButton(this.toolbar, icon, title, classNames, onClick);
                },
                getModel: () => {
                    return this.model;
                }
            });
        });

        let selectedTheme = (this.settings.themeId === Theme.Light ? 1 : 0);
        AddRadioButton(this.toolbar, ['dark_mode', 'light_mode'], [Loc('Dark mode'), Loc('Light mode')], selectedTheme, ['align_right'], (buttonIndex) => {
            if (buttonIndex === 0) {
                this.settings.themeId = Theme.Dark;
            } else if (buttonIndex === 1) {
                this.settings.themeId = Theme.Light;
            }
            HandleEvent('theme_changed', this.settings.themeId === Theme.Light ? 'light' : 'dark');
            this.SwitchTheme(this.settings.themeId, true);
        });

        this.parameters.fileInput.addEventListener('change', (ev) => {
            if (ev.target.files.length > 0) {
                HandleEvent('model_load_started', 'open_file');
                this.LoadModelFromFileList(ev.target.files);
            }
        });
    }

    InitDragAndDrop() {
        window.addEventListener('dragstart', (ev) => {
            ev.preventDefault();
        }, false);

        window.addEventListener('dragover', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'copy';
        }, false);

        window.addEventListener('drop', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            GetFilesFromDataTransfer(ev.dataTransfer, (files) => {
                if (files.length > 0) {
                    HandleEvent('model_load_started', 'drop');
                    this.LoadModelFromFileList(files);
                }
            });
        }, false);
    }

    InitSidebar() {
        this.sidebar.Init({
            getShadingType: () => {
                return this.viewer.GetShadingType();
            },
            getProjectionMode: () => {
                return this.viewer.GetProjectionMode();
            },
            getDefaultMaterials: () => {
                if (this.model === null) {
                    return [];
                }
                return GetDefaultMaterials(this.model);
            },
            onEnvironmentMapChanged: () => {
                this.settings.SaveToCookies();
                this.UpdateEnvironmentMap();
                if (this.measureTool.IsActive()) {
                    this.measureTool.UpdatePanel();
                }
            },
            onBackgroundColorChanged: () => {
                this.settings.SaveToCookies();
                this.viewer.SetBackgroundColor(this.settings.backgroundColor);
                if (this.measureTool.IsActive()) {
                    this.measureTool.UpdatePanel();
                }
            },
            onHighlightColorChanged: () => {
                this.settings.SaveToCookies();
                this.highlightColor = this.settings.highlightColor || new RGBAColor(100, 150, 255, 200);
                this.UpdateMeshesSelection();
            },
            onGlobalOpacityChanged: () => {
                this.settings.SaveToCookies();
            },
            onDefaultColorChanged: () => {
                this.settings.SaveToCookies();
                let modelLoader = this.modelLoaderUI.GetModelLoader();
                if (modelLoader.GetDefaultMaterials() !== null) {
                    ReplaceDefaultMaterialsColor(this.model, this.settings.defaultColor, this.settings.defaultLineColor);
                    modelLoader.ReplaceDefaultMaterialsColor(this.settings.defaultColor, this.settings.defaultLineColor);
                }
                this.viewer.Render();
            },
            onEdgeDisplayChanged: () => {
                HandleEvent('edge_display_changed', this.settings.showEdges ? 'on' : 'off');
                this.UpdateEdgeDisplay();
            },
            onResizeRequested: () => {
                this.layouter.Resize();
            },
            onShowHidePanels: (show) => {
                ShowDomElement(this.parameters.sidebarSplitterDiv, show);
                CookieSetBoolVal('ov_show_sidebar', show);
            }
        });
    }

    InitNavigator() {
        function GetMeshUserDataArray(viewer, meshInstanceId) {
            let userDataArr = [];
            viewer.EnumerateMeshesAndLinesUserData((meshUserData) => {
                if (meshUserData.originalMeshInstance.id.IsEqual(meshInstanceId)) {
                    userDataArr.push(meshUserData);
                }
            });
            return userDataArr;
        }

        function GetMeshesForMaterial(viewer, materialIndex) {
            let usedByMeshes = [];
            viewer.EnumerateMeshesAndLinesUserData((meshUserData) => {
                if (materialIndex === null || meshUserData.originalMaterials.indexOf(materialIndex) !== -1) {
                    usedByMeshes.push(meshUserData.originalMeshInstance);
                }
            });
            return usedByMeshes;
        }

        function GetMaterialReferenceInfo(model, materialIndex) {
            const material = model.GetMaterial(materialIndex);
            return {
                index: materialIndex,
                name: material.name,
                color: material.color.Clone()
            };
        }

        function GetMaterialsForMesh(viewer, model, meshInstanceId) {
            let usedMaterials = [];
            if (meshInstanceId === null) {
                for (let materialIndex = 0; materialIndex < model.MaterialCount(); materialIndex++) {
                    usedMaterials.push(GetMaterialReferenceInfo(model, materialIndex));
                }
            } else {
                let userDataArr = GetMeshUserDataArray(viewer, meshInstanceId);
                let addedMaterialIndices = new Set();
                for (let userData of userDataArr) {
                    for (let materialIndex of userData.originalMaterials) {
                        if (addedMaterialIndices.has(materialIndex)) {
                            continue;
                        }
                        usedMaterials.push(GetMaterialReferenceInfo(model, materialIndex));
                        addedMaterialIndices.add(materialIndex);
                    }
                }
            }
            usedMaterials.sort((a, b) => {
                return a.index - b.index;
            });
            return usedMaterials;
        }

        this.navigator.Init({
            openFileBrowserDialog: () => {
                this.OpenFileBrowserDialog();
            },
            fitMeshToWindow: (meshInstanceId) => {
                this.FitMeshToWindow(meshInstanceId);
            },
            fitMeshesToWindow: (meshInstanceIdSet) => {
                this.FitMeshesToWindow(meshInstanceIdSet);
            },
            getMeshesForMaterial: (materialIndex) => {
                return GetMeshesForMaterial(this.viewer, materialIndex);
            },
            getMaterialsForMesh: (meshInstanceId) => {
                return GetMaterialsForMesh(this.viewer, this.model, meshInstanceId);
            },
            onMeshVisibilityChanged: () => {
                this.UpdateMeshesVisibility();
            },
            onMeshSelectionChanged: () => {
                let selectedMeshIds = this.navigator.GetSelectedMeshIds();
                if (selectedMeshIds.length === 0) {
                    this.sidebar.AddObject3DProperties(this.model, this.model);
                } else if (selectedMeshIds.length === 1) {
                    let meshInstance = this.model.GetMeshInstance(selectedMeshIds[0]);
                    this.sidebar.AddObject3DProperties(this.model, meshInstance);
                } else {
                    // Multiple selections
                    let meshInstances = [];
                    for (let meshId of selectedMeshIds) {
                        let meshInstance = this.model.GetMeshInstance(meshId);
                        if (meshInstance !== null) {
                            meshInstances.push(meshInstance);
                        }
                    }
                    this.sidebar.AddMultipleObject3DProperties(this.model, meshInstances);
                }
                this.UpdateMeshesSelection();
            },
            onSelectionCleared: () => {
                this.sidebar.AddObject3DProperties(this.model, this.model);
                this.UpdateMeshesSelection();
            },
            onMeshSelected: (meshInstanceId) => {
                // This callback is only called for single selections (no Ctrl key)
                // Update the sidebar to show the selected mesh
                let meshInstance = this.model.GetMeshInstance(meshInstanceId);
                this.sidebar.AddObject3DProperties(this.model, meshInstance);
                this.UpdateMeshesSelection();
            },
            onMaterialSelected: (materialIndex) => {
                // This callback is only called for single selections (no Ctrl key)
                // Update the sidebar to show the selected material
                this.sidebar.AddMaterialProperties(this.model.GetMaterial(materialIndex));
                this.UpdateMeshesSelection();
            },
            onMaterialSelectionChanged: () => {
                let selectedMaterialIndices = this.navigator.GetSelectedMaterialIndices();
                if (selectedMaterialIndices.length === 0) {
                    // No materials selected, show model properties
                    this.sidebar.AddObject3DProperties(this.model, this.model);
                } else if (selectedMaterialIndices.length === 1) {
                    // Single material selected
                    this.sidebar.AddMaterialProperties(this.model.GetMaterial(selectedMaterialIndices[0]));
                } else {
                    // Multiple materials selected - show combined info
                    let materials = [];
                    for (let materialIndex of selectedMaterialIndices) {
                        materials.push(this.model.GetMaterial(materialIndex));
                    }
                    this.sidebar.AddMultipleMaterialProperties(materials);
                }
                this.UpdateMeshesSelection();
            },
            onResizeRequested: () => {
                this.layouter.Resize();
            },
            onShowHidePanels: (show) => {
                ShowDomElement(this.parameters.navigatorSplitterDiv, show);
                CookieSetBoolVal('ov_show_navigator', show);
            }
        });
    }

    UpdatePanelsVisibility() {
        let showNavigator = CookieGetBoolVal('ov_show_navigator', true);
        let showSidebar = CookieGetBoolVal('ov_show_sidebar', true);
        this.navigator.ShowPanels(showNavigator);
        this.sidebar.ShowPanels(showSidebar);
    }

    CreateHeaderButton(icon, title, link) {
        let buttonLink = CreateDomElement('a');
        buttonLink.setAttribute('href', link);
        buttonLink.setAttribute('target', '_blank');
        buttonLink.setAttribute('rel', 'noopener noreferrer');
        InstallTooltip(buttonLink, title);
        AddSvgIconElement(buttonLink, icon, 'header_button');
        this.parameters.headerButtonsDiv.appendChild(buttonLink);
        return buttonLink;
    }

    HideSelectedMeshes() {
        let selectedMeshIds = this.navigator.GetSelectedMeshIds();
        if (selectedMeshIds.length === 0) {
            // No meshes selected, do nothing
            return;
        }

        // Hide all selected meshes
        for (let meshId of selectedMeshIds) {
            this.navigator.ToggleMeshVisibility(meshId);
        }
    }

    InitCookieConsent() {
        let accepted = CookieGetBoolVal('ov_cookie_consent', false);
        if (accepted) {
            return;
        }

        let text = Loc('This website uses cookies to offer you better user experience. See the details at the <a target="_blank" href="info/cookies.html">Cookies Policy</a> page.');
        let popupDiv = AddDiv(document.body, 'ov_bottom_floating_panel');
        AddDiv(popupDiv, 'ov_floating_panel_text', text);
        let acceptButton = AddDiv(popupDiv, 'ov_button ov_floating_panel_button', Loc('Accept'));
        acceptButton.addEventListener('click', () => {
            CookieSetBoolVal('ov_cookie_consent', true);
            popupDiv.remove();
        });
    }

    InitKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            // Update Ctrl key state
            if (event.key === 'Control' || event.key === 'Meta') {
                this.isCtrlPressed = true;
            }

            // Handle H key for hiding meshes
            if (event.key === 'h' || event.key === 'H') {
                if (event.shiftKey) {
                    // Shift + H: Show all meshes
                    event.preventDefault();
                    this.navigator.ShowAllMeshes(true);
                } else {
                    // H: Hide selected mesh(es)
                    event.preventDefault();
                    this.HideSelectedMeshes();
                }
            }

            // Handle Escape key for clearing selection
            if (event.key === 'Escape') {
                event.preventDefault();
                this.navigator.SetSelection(null);
            }
        });

        document.addEventListener('keyup', (event) => {
            // Update Ctrl key state
            if (event.key === 'Control' || event.key === 'Meta') {
                this.isCtrlPressed = false;
            }
        });

        // Also listen for window focus/blur events to reset Ctrl state
        window.addEventListener('blur', () => {
            this.isCtrlPressed = false;
        });

        // Listen for mouse events to check Ctrl state
        document.addEventListener('mousedown', (event) => {
            this.isCtrlPressed = event.ctrlKey || event.metaKey;
        });
    }

    DebugAllObjects() {
        // Debug functionality removed - keeping method signature for compatibility
    }

    TestOpacityChange() {
        // Opacity testing functionality removed - keeping method signature for compatibility
    }

    CheckIframeReadyAndRespond() {
        console.log('CheckIframeReadyAndRespond called - model:', !!this.model, 'uiState:', this.uiState);

        // Check if the model is loaded and ready
        if (this.model && this.uiState === WebsiteUIState.Model) {
            // Model is loaded and ready
            console.log('Model is ready, sending iframe_ready message to parent');
            window.parent.postMessage({
                type: 'iframe_ready',
                status: 'ready'
            }, '*');
        } else {
            // Model not ready yet, wait and check again
            console.log('Model not ready yet, will check again in 1000ms');
            setTimeout(() => {
                this.CheckIframeReadyAndRespond();
            }, 1000); // Increased from 500ms to 1000ms for more reliable detection
        }
    }

    CheckIframeMode() {
        // Check if the website is running inside an iframe
        if (window.self !== window.top) {
            // Add iframe-mode class to body to hide title elements
            document.body.classList.add('iframe-mode');
        }
    }
}
