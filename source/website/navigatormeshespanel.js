import { MeshInstanceId } from '../engine/model/meshinstance.js';
import { AddDiv, CreateDiv, ShowDomElement, ClearDomElement, InsertDomElementBefore, SetDomElementHeight, GetDomElementOuterHeight, IsDomElementVisible, CreateDomElement } from '../engine/viewer/domutils.js';
import { CalculatePopupPositionToElementBottomRight, ShowListPopup } from './dialogs.js';
import { MeshItem, NavigatorItemRecurse, NodeItem } from './navigatoritems.js';
import { NavigatorPanel, NavigatorPopupButton } from './navigatorpanel.js';
import { AddSvgIconElement, GetMaterialName, GetMeshName, GetNodeName, SetSvgIconImageElement } from './utils.js';
import { Loc, FLoc } from '../engine/core/localization.js';

const MeshesPanelMode =
{
    Simple : 0,
    FlatList : 1,
    TreeView : 2
};

class NavigatorMaterialsPopupButton extends NavigatorPopupButton
{
    constructor (parentDiv)
    {
        super (parentDiv);
        this.materialInfoArray = null;
    }

    Update (materialInfoArray)
    {
        this.materialInfoArray = materialInfoArray;
        if (this.materialInfoArray === null) {
            return;
        }

        let materialsText = FLoc ('Materials ({0})', this.materialInfoArray.length);
        this.buttonText.innerHTML = materialsText;
    }

    OnButtonClick ()
    {
        if (this.materialInfoArray === null) {
            return;
        }

        let materialItems = [];
        for (let i = 0; i < this.materialInfoArray.length; i++) {
            let usedMaterial = this.materialInfoArray[i];
            materialItems.push ({
                name : GetMaterialName (usedMaterial.name),
                color : usedMaterial.color
            });
        }

        if (materialItems.length === 0) {
            return;
        }

        this.popup = ShowListPopup (materialItems, {
            calculatePosition : (contentDiv) => {
                return CalculatePopupPositionToElementBottomRight (this.button, contentDiv);
            },
            onClick : (index) => {
                let usedMaterial = this.materialInfoArray[index];
                this.callbacks.onMaterialSelected (usedMaterial.index);
            }
        });
    }
}

export class NavigatorMeshesPanel extends NavigatorPanel
{
    constructor (parentDiv)
    {
        super (parentDiv);

        this.callbacks = null;
        this.nodeIdToItem = new Map ();
        this.meshInstanceIdToItem = new Map ();
        this.rootItem = null;
        this.mode = MeshesPanelMode.Simple;
        this.buttons = null;
        this.searchFilter = '';
        this.allItems = new Map(); // Store all items for filtering

        this.treeView.AddClass ('tight');
        this.titleButtonsDiv = AddDiv (this.titleDiv, 'ov_navigator_tree_title_buttons');
        this.buttonsDiv = CreateDiv ('ov_navigator_buttons');
        InsertDomElementBefore (this.buttonsDiv, this.treeDiv);

        // Add search input field
        this.searchContainer = AddDiv (this.titleDiv, 'ov_navigator_search_container');
        this.searchInput = CreateDomElement ('input', 'ov_navigator_search_input');
        this.searchInput.setAttribute ('type', 'text');
        this.searchInput.setAttribute ('id', 'mesh-search-input');
        this.searchInput.setAttribute ('name', 'mesh-search');
        this.searchInput.setAttribute ('placeholder', Loc ('Search meshes...'));
        this.searchInput.setAttribute ('title', Loc ('Search meshes by name'));
        this.searchContainer.appendChild (this.searchInput);

        // Add search icon
        this.searchIcon = AddSvgIconElement (this.searchContainer, 'search', 'ov_navigator_search_icon');

        // Add clear button (initially hidden)
        this.clearButton = AddSvgIconElement (this.searchContainer, 'close', 'ov_navigator_clear_button');
        this.clearButton.style.display = 'none';
        this.clearButton.style.cursor = 'pointer';
        this.clearButton.setAttribute ('title', Loc ('Clear search'));

        // Add event listeners for search
        this.searchInput.addEventListener ('input', () => {
            this.searchFilter = this.searchInput.value.toLowerCase ();
            this.ApplySearchFilter ();
            this.UpdateClearButtonVisibility ();
        });

        this.searchInput.addEventListener ('keydown', (event) => {
            if (event.key === 'Escape') {
                this.ClearSearch ();
                event.stopPropagation (); // Prevent the global Escape handler from firing
            }
        });

        // Add clear button click handler
        this.clearButton.addEventListener ('click', () => {
            this.ClearSearch ();
        });

        this.popupDiv = AddDiv (this.panelDiv, 'ov_navigator_info_panel');
        this.materialsButton = new NavigatorMaterialsPopupButton (this.popupDiv);
    }

    GetName ()
    {
        return Loc ('Meshes');
    }

    GetIcon ()
    {
        return 'meshes';
    }

    Resize ()
    {
        let titleHeight = GetDomElementOuterHeight (this.titleDiv);
        let buttonsHeight = 0;
        if (IsDomElementVisible (this.buttonsDiv)) {
            buttonsHeight = GetDomElementOuterHeight (this.buttonsDiv);
        }
        let popupHeight = GetDomElementOuterHeight (this.popupDiv);
        let height = this.parentDiv.offsetHeight;
        SetDomElementHeight (this.treeDiv, height - titleHeight - buttonsHeight - popupHeight);
    }

    Clear ()
    {
        this.ClearMeshTree ();
        ClearDomElement (this.titleButtonsDiv);
        ClearDomElement (this.buttonsDiv);
        this.buttons = null;
        this.searchFilter = '';
        this.searchInput.value = '';
        this.allItems.clear ();
        this.UpdateClearButtonVisibility ();
        this.HideNoResultsMessage ();
    }

    ClearMeshTree ()
    {
        super.Clear ();
        this.materialsButton.Clear ();
        this.nodeIdToItem = new Map ();
        this.meshInstanceIdToItem = new Map ();
        this.rootItem = null;
        this.allItems.clear ();
    }

    Init (callbacks)
    {
        super.Init (callbacks);
        this.materialsButton.Init ({
            onMeshHover : (meshInstanceId) => {
                this.callbacks.onMeshTemporarySelected (meshInstanceId);
            },
            onMeshSelected : (meshInstanceId) => {
                this.callbacks.onMeshSelected (meshInstanceId);
            },
            onMaterialSelected : (materialIndex) => {
                this.callbacks.onMaterialSelected (materialIndex);
            }
        });
    }

    Fill (importResult)
    {
        super.Fill (importResult);

        const rootNode = importResult.model.GetRootNode ();
        let isHierarchical = false;
        for (let childNode of rootNode.GetChildNodes ()) {
            if (childNode.ChildNodeCount () > 0 || childNode.MeshIndexCount () > 1) {
                isHierarchical = true;
                break;
            }
        }

        if (this.mode === MeshesPanelMode.Simple && isHierarchical) {
            this.mode = MeshesPanelMode.TreeView;
        } else if (this.mode !== MeshesPanelMode.Simple && !isHierarchical) {
            this.mode = MeshesPanelMode.Simple;
        }

        this.FillButtons (importResult);
        if (this.mode === MeshesPanelMode.Simple) {
            ShowDomElement (this.buttonsDiv, false);
            this.titleDiv.classList.add ('withbuttons');
            this.titleDiv.classList.remove ('nomargin');
        } else {
            ShowDomElement (this.buttonsDiv, true);
            this.titleDiv.classList.remove ('withbuttons');
            this.titleDiv.classList.add ('nomargin');
        }

        this.FillMeshTree (importResult.model);
        this.Resize ();
    }

    FillButtons (importResult)
    {
        function CreateButton (parentDiv, button, className, onClick)
        {
            button.div = AddDiv (parentDiv, 'ov_navigator_button');
            button.div.setAttribute ('alt', button.name);
            button.div.setAttribute ('title', button.name);
            if (className) {
                button.div.classList.add (className);
            }
            button.iconDiv = AddSvgIconElement (button.div, button.icon);
            button.div.addEventListener ('click', () => {
                onClick ();
            });
        }

        function UpdateButtonsStatus (buttons, mode)
        {
            let showTree = (mode === MeshesPanelMode.TreeView);
            if (showTree) {
                buttons.flatList.iconDiv.classList.remove ('selected');
                buttons.treeView.iconDiv.classList.add ('selected');
            } else {
                buttons.flatList.iconDiv.classList.add ('selected');
                buttons.treeView.iconDiv.classList.remove ('selected');
            }
            ShowDomElement (buttons.separator, showTree);
            ShowDomElement (buttons.expandAll.div, showTree);
            ShowDomElement (buttons.collapseAll.div, showTree);
        }

        function UpdateView (panel, importResult)
        {
            let hiddenMeshInstanceIds = [];
            panel.EnumerateMeshItems ((meshItem) => {
                if (!meshItem.IsVisible ()) {
                    hiddenMeshInstanceIds.push (meshItem.GetMeshInstanceId ());
                }
                return true;
            });

            panel.ClearMeshTree ();
            panel.FillMeshTree (importResult.model);

            for (let meshInstanceId of hiddenMeshInstanceIds) {
                let meshItem = panel.GetMeshItem (meshInstanceId);
                meshItem.SetVisible (false, NavigatorItemRecurse.Parents);
            }

            UpdateButtonsStatus (panel.buttons, panel.mode);
            panel.callbacks.onViewTypeChanged ();
        }

        this.buttons = {
            flatList : {
                name : Loc ('Flat list'),
                icon : 'flat_list',
                div : null,
                iconDiv : null
            },
            treeView : {
                name : Loc ('Tree view'),
                icon : 'tree_view',
                div : null,
                iconDiv : null
            },
            separator : null,
            expandAll : {
                name : Loc ('Expand all'),
                icon : 'expand',
                div : null,
                iconDiv : null
            },
            collapseAll : {
                name : Loc ('Collapse all'),
                icon : 'collapse',
                div : null,
                iconDiv : null
            },
            showHideMeshes : {
                name : Loc ('Show/hide meshes'),
                icon : 'visible',
                div : null,
                iconDiv : null
            },
            fitToWindow : {
                name : Loc ('Fit meshes to window'),
                icon : 'fit',
                div : null,
                iconDiv : null
            }
        };

        if (this.mode === MeshesPanelMode.Simple) {
            CreateButton (this.titleButtonsDiv, this.buttons.showHideMeshes, 'right', () => {
                let nodeId = this.rootItem.GetNodeId ();
                this.callbacks.onNodeShowHide (nodeId);
            });

            CreateButton (this.titleButtonsDiv, this.buttons.fitToWindow, 'right', () => {
                let nodeId = this.rootItem.GetNodeId ();
                this.callbacks.onNodeFitToWindow (nodeId);
            });
        } else {
            CreateButton (this.buttonsDiv, this.buttons.flatList, null, () => {
                if (this.mode === MeshesPanelMode.FlatList) {
                    return;
                }
                this.mode = MeshesPanelMode.FlatList;
                UpdateView (this, importResult);
            });

            CreateButton (this.buttonsDiv, this.buttons.treeView, null, () => {
                if (this.mode === MeshesPanelMode.TreeView) {
                    return;
                }
                this.mode = MeshesPanelMode.TreeView;
                UpdateView (this, importResult);
            });

            this.buttons.separator = AddDiv (this.buttonsDiv, 'ov_navigator_buttons_separator');

            CreateButton (this.buttonsDiv, this.buttons.expandAll, null, () => {
                this.rootItem.ExpandAll (true);
            });

            CreateButton (this.buttonsDiv, this.buttons.collapseAll, null, () => {
                this.rootItem.ExpandAll (false);
            });

            CreateButton (this.buttonsDiv, this.buttons.showHideMeshes, 'right', () => {
                let nodeId = this.rootItem.GetNodeId ();
                this.callbacks.onNodeShowHide (nodeId);
            });

            CreateButton (this.buttonsDiv, this.buttons.fitToWindow, 'right', () => {
                let nodeId = this.rootItem.GetNodeId ();
                this.callbacks.onNodeFitToWindow (nodeId);
            });

            UpdateButtonsStatus (this.buttons, this.mode);
        }
    }

    ApplySearchFilter ()
    {
        if (!this.searchFilter) {
            // Show all items when no filter
            this.allItems.forEach ((item) => {
                if (item.mainElement) {
                    ShowDomElement (item.mainElement, true);
                }
            });
            return;
        }

        // Hide all items first
        this.allItems.forEach ((item) => {
            if (item.mainElement) {
                ShowDomElement (item.mainElement, false);
            }
        });

        // Show items that match the filter
        this.allItems.forEach ((item) => {
            if (item.name && item.name.toLowerCase ().includes (this.searchFilter)) {
                ShowDomElement (item.mainElement, true);
                // Also show parent nodes to maintain tree structure
                this.ShowParentNodes (item);
            }
        });

        // If no items match, show a "no results" message
        let hasVisibleItems = false;
        this.allItems.forEach ((item) => {
            if (item.mainElement && IsDomElementVisible (item.mainElement)) {
                hasVisibleItems = true;
            }
        });

        if (!hasVisibleItems) {
            this.ShowNoResultsMessage ();
        } else {
            this.HideNoResultsMessage ();
        }
    }

    ShowNoResultsMessage ()
    {
        if (!this.noResultsDiv) {
            this.noResultsDiv = AddDiv (this.treeDiv, 'ov_navigator_no_results');
            this.noResultsDiv.innerHTML = Loc ('No meshes found matching your search.');
        }
        ShowDomElement (this.noResultsDiv, true);
    }

    HideNoResultsMessage ()
    {
        if (this.noResultsDiv) {
            ShowDomElement (this.noResultsDiv, false);
        }
    }

    UpdateClearButtonVisibility ()
    {
        if (this.searchInput.value.length > 0) {
            this.clearButton.style.display = 'block';
        } else {
            this.clearButton.style.display = 'none';
        }
    }

    ClearSearch ()
    {
        this.searchInput.value = '';
        this.searchFilter = '';
        this.ApplySearchFilter ();
        this.UpdateClearButtonVisibility ();
        this.searchInput.focus ();
    }

    ShowParentNodes (item)
    {
        let parent = item.parent;
        while (parent && parent.mainElement) {
            ShowDomElement (parent.mainElement, true);
            parent = parent.parent;
        }
    }

    FillMeshTree (model)
    {
        function AddMeshToNodeTree (panel, node, mesh, meshIndex, parentItem, mode)
        {
            let meshName = GetMeshName (node.GetName (), mesh.GetName ());
            let meshInstanceId = new MeshInstanceId (node.GetId (), meshIndex);
            let meshItemIcon = (mode === MeshesPanelMode.TreeView ? 'tree_mesh' : null);
            let meshItem = new MeshItem (meshName, meshItemIcon, meshInstanceId, {
                onShowHide : (selectedMeshId) => {
                    panel.callbacks.onMeshShowHide (selectedMeshId);
                },
                onFitToWindow : (selectedMeshId) => {
                    panel.callbacks.onFitToWindow (selectedMeshId);
                },
                onMeshSelected : (selectedMeshId) => {
                    panel.callbacks.onMeshSelected (selectedMeshId);
                },
                onMeshToggleSelection : (selectedMeshId) => {
                    panel.callbacks.onMeshToggleSelection (selectedMeshId);
                }
            });
            panel.meshInstanceIdToItem.set (meshInstanceId.GetKey (), meshItem);
            panel.allItems.set (meshInstanceId.GetKey (), meshItem);
            parentItem.AddChild (meshItem);
        }

        function CreateNodeItem (panel, node)
        {
            const nodeName = GetNodeName (node.GetName ());
            const nodeId = node.GetId ();
            let nodeItem = new NodeItem (nodeName, nodeId, {
                onShowHide : (selectedNodeId) => {
                    panel.callbacks.onNodeShowHide (selectedNodeId);
                },
                onFitToWindow : (selectedNodeId) => {
                    panel.callbacks.onNodeFitToWindow (selectedNodeId);
                }
            });
            panel.nodeIdToItem.set (nodeId, nodeItem);
            panel.allItems.set (nodeId, nodeItem);
            return nodeItem;
        }

        function CreateDummyRootItem (panel, node)
        {
            const nodeId = node.GetId ();
            let rootItem = new NodeItem ('SCENE', nodeId, {
                onVisibilityChanged : (isVisible) => {
                    if (isVisible) {
                        SetSvgIconImageElement (panel.buttons.showHideMeshes.iconDiv, 'visible');
                    } else {
                        SetSvgIconImageElement (panel.buttons.showHideMeshes.iconDiv, 'hidden');
                    }
                }
            });
            rootItem.Show (false);
            rootItem.ShowChildren (true);
            panel.treeView.AddChild (rootItem);
            panel.nodeIdToItem.set (nodeId, rootItem);
            panel.allItems.set (nodeId, rootItem);
            return rootItem;
        }

        function AddModelNodeToTree (panel, model, node, parentItem, mode)
        {
            let meshNodes = [];
            for (let childNode of node.GetChildNodes ()) {
                if (mode === MeshesPanelMode.TreeView) {
                    if (childNode.IsMeshNode ()) {
                        meshNodes.push (childNode);
                    } else {
                        let nodeItem = CreateNodeItem (panel, childNode);
                        parentItem.AddChild (nodeItem);
                        AddModelNodeToTree (panel, model, childNode, nodeItem, mode);
                    }
                } else {
                    AddModelNodeToTree (panel, model, childNode, parentItem, mode);
                }
            }
            for (let meshNode of meshNodes) {
                AddModelNodeToTree (panel, model, meshNode, parentItem, mode);
            }
            for (let meshIndex of node.GetMeshIndices ()) {
                let mesh = model.GetMesh (meshIndex);
                AddMeshToNodeTree (panel, node, mesh, meshIndex, parentItem, mode);
            }
        }

        let rootNode = model.GetRootNode ();
        this.rootItem = CreateDummyRootItem (this, rootNode);
        AddModelNodeToTree (this, model, rootNode, this.rootItem, this.mode);
    }

    UpdateMaterialList (materialInfoArray)
    {
        this.materialsButton.Update (materialInfoArray);
    }

    GetNodeItem (nodeId)
    {
        return this.nodeIdToItem.get (nodeId);
    }

    MeshItemCount ()
    {
        return this.meshInstanceIdToItem.size;
    }

    GetMeshItem (meshInstanceId)
    {
        return this.meshInstanceIdToItem.get (meshInstanceId.GetKey ());
    }

    EnumerateNodeItems (processor)
    {
        for (const nodeItem of this.nodeIdToItem.values ()) {
            if (!processor (nodeItem)) {
                break;
            }
        }
    }

    EnumerateMeshItems (processor)
    {
        for (const meshItem of this.meshInstanceIdToItem.values ()) {
            if (!processor (meshItem)) {
                break;
            }
        }
    }

    IsMeshVisible (meshInstanceId)
    {
        let meshItem = this.GetMeshItem (meshInstanceId);
        return meshItem.IsVisible ();
    }

    HasHiddenMesh ()
    {
        let hasHiddenMesh = false;
        this.EnumerateMeshItems ((meshItem) => {
            if (!meshItem.IsVisible ()) {
                hasHiddenMesh = true;
                return false;
            }
            return true;
        });
        return hasHiddenMesh;
    }

    ShowAllMeshes (show)
    {
        this.EnumerateNodeItems ((nodeItem) => {
            nodeItem.SetVisible (show, NavigatorItemRecurse.No);
            return true;
        });
        this.EnumerateMeshItems ((meshItem) => {
            meshItem.SetVisible (show, NavigatorItemRecurse.No);
            return true;
        });
    }

    ToggleNodeVisibility (nodeId)
    {
        let nodeItem = this.GetNodeItem (nodeId);
        nodeItem.SetVisible (!nodeItem.IsVisible (), NavigatorItemRecurse.All);
    }

    ToggleMeshVisibility (meshInstanceId)
    {
        let meshItem = this.GetMeshItem (meshInstanceId);
        meshItem.SetVisible (!meshItem.IsVisible (), NavigatorItemRecurse.Parents);
    }

    IsMeshIsolated (meshInstanceId)
    {
        let isIsolated = true;
        this.EnumerateMeshItems ((meshItem) => {
            if (!meshItem.GetMeshInstanceId ().IsEqual (meshInstanceId) && meshItem.IsVisible ()) {
                isIsolated = false;
                return false;
            }
            return true;
        });
        return isIsolated;
    }

    IsolateMesh (meshInstanceId)
    {
        this.ShowAllMeshes (false);
        this.ToggleMeshVisibility (meshInstanceId);
    }

    ClearSelections ()
    {
        for (const meshItem of this.meshInstanceIdToItem.values()) {
            if (meshItem && typeof meshItem.SetSelected === 'function') {
                meshItem.SetSelected(false);
            }
            if (meshItem && typeof meshItem.SetMultiSelected === 'function') {
                meshItem.SetMultiSelected(false);
            }
        }
        for (const nodeItem of this.nodeIdToItem.values()) {
            if (nodeItem && typeof nodeItem.SetSelected === 'function') {
                nodeItem.SetSelected(false);
            }
            if (nodeItem && typeof nodeItem.SetMultiSelected === 'function') {
                nodeItem.SetMultiSelected(false);
            }
        }
    }
}
