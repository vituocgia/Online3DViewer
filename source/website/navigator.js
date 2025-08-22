import { GetDomElementOuterWidth, SetDomElementOuterHeight, SetDomElementOuterWidth } from '../engine/viewer/domutils.js';
import { NavigatorFilesPanel } from './navigatorfilespanel.js';
import { NavigatorMaterialsPanel } from './navigatormaterialspanel.js';
import { NavigatorMeshesPanel } from './navigatormeshespanel.js';
import { PanelSet } from './panelset.js';

export const SelectionType =
{
    Material : 1,
    Mesh : 2
};

export class Selection
{
    constructor (type, data)
    {
        this.type = type;
        this.materialIndex = null;
        this.meshInstanceId = null;
        if (this.type === SelectionType.Material) {
            this.materialIndex = data;
        } else if (this.type === SelectionType.Mesh) {
            this.meshInstanceId = data;
        }
    }

    IsEqual (rhs)
    {
        if (this.type !== rhs.type) {
            return false;
        }
        if (this.type === SelectionType.Material) {
            return this.materialIndex === rhs.materialIndex;
        } else if (this.type === SelectionType.Mesh) {
            return this.meshInstanceId.IsEqual (rhs.meshInstanceId);
        }
    }
}

export class MultipleSelection
{
    constructor ()
    {
        this.selections = new Map(); // Map<SelectionType, Set<data>>
        this.selections.set(SelectionType.Material, new Set());
        this.selections.set(SelectionType.Mesh, new Map()); // Use Map with GetKey() for MeshInstanceId
    }

    AddSelection (selection)
    {
        if (selection.type === SelectionType.Material) {
            this.selections.get(SelectionType.Material).add(selection.materialIndex);
        } else if (selection.type === SelectionType.Mesh) {
            this.selections.get(SelectionType.Mesh).set(selection.meshInstanceId.GetKey(), selection.meshInstanceId);
        }
    }

    RemoveSelection (selection)
    {
        if (selection.type === SelectionType.Material) {
            this.selections.get(SelectionType.Material).delete(selection.materialIndex);
        } else if (selection.type === SelectionType.Mesh) {
            this.selections.get(SelectionType.Mesh).delete(selection.meshInstanceId.GetKey());
        }
    }

    HasSelection (selection)
    {
        if (selection.type === SelectionType.Material) {
            return this.selections.get(SelectionType.Material).has(selection.materialIndex);
        } else if (selection.type === SelectionType.Mesh) {
            return this.selections.get(SelectionType.Mesh).has(selection.meshInstanceId.GetKey());
        }
        return false;
    }

    GetMaterialSelections ()
    {
        return Array.from(this.selections.get(SelectionType.Material));
    }

    GetMeshSelections ()
    {
        return Array.from(this.selections.get(SelectionType.Mesh).values());
    }

    Clear ()
    {
        this.selections.get(SelectionType.Material).clear();
        this.selections.get(SelectionType.Mesh).clear();
    }

    IsEmpty ()
    {
        return this.selections.get(SelectionType.Material).size === 0 &&
               this.selections.get(SelectionType.Mesh).size === 0;
    }

    GetCount ()
    {
        return this.selections.get(SelectionType.Material).size +
               this.selections.get(SelectionType.Mesh).size;
    }
}

export class Navigator
{
    constructor (mainDiv)
    {
        this.mainDiv = mainDiv;

        this.panelSet = new PanelSet (mainDiv);
        this.callbacks = null;
        this.selection = new MultipleSelection();
        this.tempSelectedMeshId = null;

        this.filesPanel = new NavigatorFilesPanel (this.panelSet.GetContentDiv ());
        this.materialsPanel = new NavigatorMaterialsPanel (this.panelSet.GetContentDiv ());
        this.meshesPanel = new NavigatorMeshesPanel (this.panelSet.GetContentDiv ());

        this.panelSet.AddPanel (this.filesPanel);
        this.panelSet.AddPanel (this.materialsPanel);
        this.panelSet.AddPanel (this.meshesPanel);
        this.panelSet.ShowPanel (this.meshesPanel);
    }

    IsPanelsVisible ()
    {
        return this.panelSet.IsPanelsVisible ();
    }

    ShowPanels (show)
    {
        this.panelSet.ShowPanels (show);
    }

    Init (callbacks)
    {
        this.callbacks = callbacks;

        this.panelSet.Init ({
            onResizeRequested : () => {
                this.callbacks.onResizeRequested ();
            },
            onShowHidePanels : (show) => {
                this.callbacks.onShowHidePanels (show);
            }
        });

        this.filesPanel.Init ({
            onFileBrowseButtonClicked : () => {
                this.callbacks.openFileBrowserDialog ();
            }
        });

        this.materialsPanel.Init ({
            onMaterialSelected : (materialIndex) => {
                this.SetSelection (new Selection (SelectionType.Material, materialIndex));
            },
            onMaterialToggleSelection : (materialIndex) => {
                this.ToggleSelection (new Selection (SelectionType.Material, materialIndex));
            },
            onMeshTemporarySelected : (meshInstanceId) => {
                this.tempSelectedMeshId = meshInstanceId;
                this.callbacks.onMeshSelectionChanged ();
            },
            onMeshSelected : (meshInstanceId) => {
                this.SetSelection (new Selection (SelectionType.Mesh, meshInstanceId));
            }
        });

        this.meshesPanel.Init ({
            onMeshSelected : (meshId) => {
                this.SetSelection (new Selection (SelectionType.Mesh, meshId));
            },
            onMeshToggleSelection : (meshId) => {
                this.ToggleSelection (new Selection (SelectionType.Mesh, meshId));
            },
            onMeshShowHide : (meshId) => {
                this.ToggleMeshVisibility (meshId);
            },
            onFitToWindow : (meshId) => {
                this.FitMeshToWindow (meshId);
            },
            onNodeShowHide : (nodeId) => {
                this.ToggleNodeVisibility (nodeId);
            },
            onNodeFitToWindow : (nodeId) => {
                this.FitNodeToWindow (nodeId);
            },
            onMaterialSelected : (materialIndex) => {
                this.SetSelection (new Selection (SelectionType.Material, materialIndex));
            },
            onViewTypeChanged : () => {
                this.SetSelection (null);
            }
        });
    }

    GetWidth ()
    {
        return GetDomElementOuterWidth (this.mainDiv);
    }

    SetWidth (width)
    {
        SetDomElementOuterWidth (this.mainDiv, width);
    }

    Resize (height)
    {
        SetDomElementOuterHeight (this.mainDiv, height);
        this.panelSet.Resize ();
    }

    FillTree (importResult)
    {
        this.filesPanel.Fill (importResult);
        if (importResult.missingFiles.length === 0) {
            this.panelSet.SetPanelIcon (this.filesPanel, 'files');
        } else {
            this.panelSet.SetPanelIcon (this.filesPanel, 'missing_files');
        }
        this.materialsPanel.Fill (importResult);
        this.meshesPanel.Fill (importResult);
        this.OnSelectionChanged ();
    }

    MeshItemCount ()
    {
        return this.meshesPanel.MeshItemCount ();
    }

    IsMeshVisible (meshInstanceId)
    {
        return this.meshesPanel.IsMeshVisible (meshInstanceId);
    }

    HasHiddenMesh ()
    {
        return this.meshesPanel.HasHiddenMesh ();
    }

    ShowAllMeshes (show)
    {
        this.meshesPanel.ShowAllMeshes (show);
        this.callbacks.onMeshVisibilityChanged ();
    }

    ToggleNodeVisibility (nodeId)
    {
        this.meshesPanel.ToggleNodeVisibility (nodeId);
        this.callbacks.onMeshVisibilityChanged ();
    }

    ToggleMeshVisibility (meshInstanceId)
    {
        this.meshesPanel.ToggleMeshVisibility (meshInstanceId);
        this.callbacks.onMeshVisibilityChanged ();
    }

    IsMeshIsolated (meshInstanceId)
    {
        return this.meshesPanel.IsMeshIsolated (meshInstanceId);
    }

    IsolateMesh (meshInstanceId)
    {
        this.meshesPanel.IsolateMesh (meshInstanceId);
        this.callbacks.onMeshVisibilityChanged ();
    }

    GetSelectedMeshIds ()
    {
        if (this.tempSelectedMeshId !== null) {
            return [this.tempSelectedMeshId];
        }
        return this.selection.GetMeshSelections();
    }

    GetSelectedMaterialIndices ()
    {
        return this.selection.GetMaterialSelections();
    }

    AddToSelection (selection)
    {
        this.selection.AddSelection(selection);
        this.UpdateSelectionUI();
        this.OnSelectionChanged();
    }

    RemoveFromSelection (selection)
    {
        this.selection.RemoveSelection(selection);
        this.UpdateSelectionUI();
        this.OnSelectionChanged();
    }

    ToggleSelection (selection)
    {
        if (this.selection.HasSelection(selection)) {
            this.RemoveFromSelection(selection);
        } else {
            this.AddToSelection(selection);
        }
    }

    SetSelection (selection)
    {
        // For backward compatibility, clear and set single selection
        this.selection.Clear();
        if (selection !== null) {
            this.selection.AddSelection(selection);
        }
        this.UpdateSelectionUI();
        this.OnSelectionChanged();
    }

    UpdateSelectionUI ()
    {
        // Update material panel selections
        this.materialsPanel.ClearSelections();
        let materialSelections = this.selection.GetMaterialSelections();
        for (let materialIndex of materialSelections) {
            let materialItem = this.materialsPanel.GetMaterialItem(materialIndex);
            if (materialItem) {
                if (materialSelections.length > 1) {
                    materialItem.SetMultiSelected(true);
                } else {
                    materialItem.SetSelected(true);
                }
            }
        }

        // Update meshes panel selections
        this.meshesPanel.ClearSelections();
        let meshSelections = this.selection.GetMeshSelections();
        for (let meshInstanceId of meshSelections) {
            let meshItem = this.meshesPanel.GetMeshItem(meshInstanceId);
            if (meshItem) {
                if (meshSelections.length > 1) {
                    meshItem.SetMultiSelected(true);
                } else {
                    meshItem.SetSelected(true);
                }
            }
        }
    }

    OnSelectionChanged ()
    {
        if (this.selection.IsEmpty()) {
            this.callbacks.onSelectionCleared ();
        } else {
            // Only call the appropriate callback based on what's selected
            let materialSelections = this.selection.GetMaterialSelections();
            let meshSelections = this.selection.GetMeshSelections();

            if (materialSelections.length > 0 && meshSelections.length === 0) {
                // Only materials selected
                this.callbacks.onMaterialSelectionChanged ();
            } else if (meshSelections.length > 0 && materialSelections.length === 0) {
                // Only meshes selected
                this.callbacks.onMeshSelectionChanged ();
            } else if (meshSelections.length > 0 && materialSelections.length > 0) {
                // Both materials and meshes selected - prioritize meshes
                this.callbacks.onMeshSelectionChanged ();
            }
        }
        this.UpdatePanels ();
    }

    UpdatePanels ()
    {
        let materialIndex = null;
        let meshInstanceId = null;
        if (this.selection.IsEmpty()) {
            materialIndex = null;
            meshInstanceId = null;
        } else {
            if (this.selection.GetMaterialSelections().length > 0) {
                materialIndex = this.selection.GetMaterialSelections()[0];
            }
            if (this.selection.GetMeshSelections().length > 0) {
                meshInstanceId = this.selection.GetMeshSelections()[0];
            }
        }

        let usedByMeshes = this.callbacks.getMeshesForMaterial (materialIndex);
        this.materialsPanel.UpdateMeshList (usedByMeshes);

        let usedByMaterials = this.callbacks.getMaterialsForMesh (meshInstanceId);
        this.meshesPanel.UpdateMaterialList (usedByMaterials);
    }

    FitNodeToWindow (nodeId)
    {
        let meshInstanceIdSet = new Set ();
        let nodeItem = this.meshesPanel.GetNodeItem (nodeId);
        nodeItem.EnumerateMeshItems ((meshItem) => {
            meshInstanceIdSet.add (meshItem.GetMeshInstanceId ());
        });
        this.callbacks.fitMeshesToWindow (meshInstanceIdSet);
    }

    FitMeshToWindow (meshInstanceId)
    {
        this.callbacks.fitMeshToWindow (meshInstanceId);
    }

    Clear ()
    {
        this.panelSet.Clear ();
        this.selection.Clear();
    }
}
