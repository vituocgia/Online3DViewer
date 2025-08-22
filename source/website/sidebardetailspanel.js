import { RunTaskAsync } from '../engine/core/taskrunner.js';
import { SubCoord3D } from '../engine/geometry/coord3d.js';
import { GetBoundingBox, IsTwoManifold } from '../engine/model/modelutils.js';
import { CalculateVolume, CalculateSurfaceArea } from '../engine/model/quantities.js';
import { Property, PropertyToString, PropertyType } from '../engine/model/property.js';
import { AddDiv, AddDomElement, ClearDomElement } from '../engine/viewer/domutils.js';
import { SidebarPanel } from './sidebarpanel.js';
import { CreateInlineColorCircle } from './utils.js';
import { GetFileName, IsUrl } from '../engine/io/fileutils.js';
import { MaterialSource, MaterialType } from '../engine/model/material.js';
import { RGBColorToHexString } from '../engine/model/color.js';
import { Unit } from '../engine/model/unit.js';
import { Loc } from '../engine/core/localization.js';
import { Coord3D } from '../engine/geometry/coord3d.js';
import { PropertyGroup } from '../engine/model/property.js';

function UnitToString (unit)
{
    switch (unit) {
        case Unit.Millimeter:
            return Loc ('Millimeter');
        case Unit.Centimeter:
            return Loc ('Centimeter');
        case Unit.Meter:
            return Loc ('Meter');
        case Unit.Inch:
            return Loc ('Inch');
        case Unit.Foot:
            return Loc ('Foot');
    }
    return Loc ('Unknown');
}

export class SidebarDetailsPanel extends SidebarPanel
{
    constructor (parentDiv)
    {
        super (parentDiv);
    }

    GetName ()
    {
        return Loc ('Details');
    }

    GetIcon ()
    {
        return 'details';
    }

    AddObject3DProperties (model, object3D)
    {
        this.Clear ();
        let table = AddDiv (this.contentDiv, 'ov_property_table');
        let boundingBox = GetBoundingBox (object3D);
        let size = SubCoord3D (boundingBox.max, boundingBox.min);
        let unit = model.GetUnit ();
        this.AddProperty (table, new Property (PropertyType.Integer, Loc ('Vertices'), object3D.VertexCount ()));
        let lineSegmentCount = object3D.LineSegmentCount ();
        if (lineSegmentCount > 0) {
            this.AddProperty (table, new Property (PropertyType.Integer, Loc ('Lines'), lineSegmentCount));
        }
        let triangleCount = object3D.TriangleCount ();
        if (triangleCount > 0) {
            this.AddProperty (table, new Property (PropertyType.Integer, Loc ('Triangles'), triangleCount));
        }
        if (unit !== Unit.Unknown) {
            this.AddProperty (table, new Property (PropertyType.Text, Loc ('Unit'), UnitToString (unit)));
        }
        this.AddProperty (table, new Property (PropertyType.Number, Loc ('Size X'), size.x));
        this.AddProperty (table, new Property (PropertyType.Number, Loc ('Size Y'), size.y));
        this.AddProperty (table, new Property (PropertyType.Number, Loc ('Size Z'), size.z));
        this.AddCalculatedProperty (table, Loc ('Volume'), () => {
            if (!IsTwoManifold (object3D)) {
                return null;
            }
            const volume = CalculateVolume (object3D);
            return new Property (PropertyType.Number, null, volume);
        });
        this.AddCalculatedProperty (table, Loc ('Surface'), () => {
            const surfaceArea = CalculateSurfaceArea (object3D);
            return new Property (PropertyType.Number, null, surfaceArea);
        });
        if (object3D.PropertyGroupCount () > 0) {
            let customTable = AddDiv (this.contentDiv, 'ov_property_table ov_property_table_custom');
            for (let i = 0; i < object3D.PropertyGroupCount (); i++) {
                const propertyGroup = object3D.GetPropertyGroup (i);
                this.AddPropertyGroup (customTable, propertyGroup);
                for (let j = 0; j < propertyGroup.PropertyCount (); j++) {
                    const property = propertyGroup.GetProperty (j);
                    this.AddPropertyInGroup (customTable, property);
                }
            }
        }
        this.Resize ();
    }

    AddMultipleObject3DProperties (model, object3Ds)
    {
        this.Clear ();
        let table = AddDiv (this.contentDiv, 'ov_property_table');

        // Add selection count
        this.AddProperty (table, new Property (PropertyType.Integer, Loc ('Selected Objects'), object3Ds.length));

        // Calculate combined properties
        let totalVertices = 0;
        let totalLines = 0;
        let totalTriangles = 0;
        let combinedBoundingBox = null;

        for (let object3D of object3Ds) {
            totalVertices += object3D.VertexCount();
            totalLines += object3D.LineSegmentCount();
            totalTriangles += object3D.TriangleCount();

            let boundingBox = GetBoundingBox(object3D);
            if (combinedBoundingBox === null) {
                combinedBoundingBox = boundingBox;
            } else {
                combinedBoundingBox.min.x = Math.min(combinedBoundingBox.min.x, boundingBox.min.x);
                combinedBoundingBox.min.y = Math.min(combinedBoundingBox.min.y, boundingBox.min.y);
                combinedBoundingBox.min.z = Math.min(combinedBoundingBox.min.z, boundingBox.min.z);
                combinedBoundingBox.max.x = Math.max(combinedBoundingBox.max.x, boundingBox.max.x);
                combinedBoundingBox.max.y = Math.max(combinedBoundingBox.max.y, boundingBox.max.y);
                combinedBoundingBox.max.z = Math.max(combinedBoundingBox.max.z, boundingBox.max.z);
            }
        }

        let unit = model.GetUnit();
        this.AddProperty (table, new Property (PropertyType.Integer, Loc ('Total Vertices'), totalVertices));
        if (totalLines > 0) {
            this.AddProperty (table, new Property (PropertyType.Integer, Loc ('Total Lines'), totalLines));
        }
        if (totalTriangles > 0) {
            this.AddProperty (table, new Property (PropertyType.Integer, Loc ('Total Triangles'), totalTriangles));
        }

        if (combinedBoundingBox !== null) {
            let size = SubCoord3D (combinedBoundingBox.max, combinedBoundingBox.min);
            if (unit !== Unit.Unknown) {
                this.AddProperty (table, new Property (PropertyType.Text, Loc ('Unit'), UnitToString (unit)));
            }
            this.AddProperty (table, new Property (PropertyType.Number, Loc ('Combined Size X'), size.x));
            this.AddProperty (table, new Property (PropertyType.Number, Loc ('Combined Size Y'), size.y));
            this.AddProperty (table, new Property (PropertyType.Number, Loc ('Combined Size Z'), size.z));
        }

        this.Resize ();
    }

    AddMaterialProperties (material)
    {
        function AddTextureMap (obj, table, name, map)
        {
            if (map === null || map.name === null) {
                return;
            }
            let fileName = GetFileName (map.name);
            obj.AddProperty (table, new Property (PropertyType.Text, name, fileName));
        }

        this.Clear ();
        let table = AddDiv (this.contentDiv, 'ov_property_table');
        let typeString = null;
        if (material.type === MaterialType.Phong) {
            typeString = Loc ('Phong');
        } else if (material.type === MaterialType.Physical) {
            typeString = Loc ('Physical');
        }
        let materialSource = (material.source !== MaterialSource.Model) ? Loc ('Default') : Loc ('Model');
        this.AddProperty (table, new Property (PropertyType.Text, Loc ('Source'), materialSource));
        this.AddProperty (table, new Property (PropertyType.Text, Loc ('Type'), typeString));
        if (material.vertexColors) {
            this.AddProperty (table, new Property (PropertyType.Text, Loc ('Color'), Loc ('Vertex colors')));
        } else {
            this.AddProperty (table, new Property (PropertyType.Color, Loc ('Color'), material.color));
            if (material.type === MaterialType.Phong) {
                this.AddProperty (table, new Property (PropertyType.Color, Loc ('Ambient'), material.ambient));
                this.AddProperty (table, new Property (PropertyType.Color, Loc ('Specular'), material.specular));
            }
        }
        if (material.type === MaterialType.Physical) {
            this.AddProperty (table, new Property (PropertyType.Percent, Loc ('Metalness'), material.metalness));
            this.AddProperty (table, new Property (PropertyType.Percent, Loc ('Roughness'), material.roughness));
        }
        if (material.opacity !== undefined && material.opacity < 1.0) {
            this.AddProperty (table, new Property (PropertyType.Percent, Loc ('Opacity'), material.opacity * 100.0));
        }
        if (material.transparent) {
            this.AddProperty (table, new Property (PropertyType.Text, Loc ('Transparency'), Loc ('Yes')));
        }
        if (material.textures !== null) {
            let textureTable = AddDiv (this.contentDiv, 'ov_property_table ov_property_table_custom');
            this.AddPropertyGroup (textureTable, new PropertyGroup (Loc ('Textures')));
            for (let textureName in material.textures) {
                if (Object.prototype.hasOwnProperty.call (material.textures, textureName)) {
                    let texture = material.textures[textureName];
                    AddTextureMap (this, textureTable, textureName, texture);
                }
            }
        }
        this.Resize ();
    }

    AddMultipleMaterialProperties (materials)
    {
        this.Clear ();
        let table = AddDiv (this.contentDiv, 'ov_property_table');

        // Add selection count
        this.AddProperty (table, new Property (PropertyType.Integer, Loc ('Selected Materials'), materials.length));

        // Show common properties
        let hasVertexColors = materials.some(m => m.vertexColors);
        let hasTransparency = materials.some(m => m.transparent);
        let hasTextures = materials.some(m => m.textures !== null);

        if (hasVertexColors) {
            this.AddProperty (table, new Property (PropertyType.Text, Loc ('Vertex Colors'), Loc ('Mixed')));
        }
        if (hasTransparency) {
            this.AddProperty (table, new Property (PropertyType.Text, Loc ('Transparency'), Loc ('Mixed')));
        }
        if (hasTextures) {
            this.AddProperty (table, new Property (PropertyType.Text, Loc ('Textures'), Loc ('Mixed')));
        }

        // Show material types
        let materialTypes = new Set();
        for (let material of materials) {
            if (material.type === MaterialType.Phong) {
                materialTypes.add(Loc('Phong'));
            } else if (material.type === MaterialType.Physical) {
                materialTypes.add(Loc('Physical'));
            }
        }
        if (materialTypes.size > 0) {
            this.AddProperty (table, new Property (PropertyType.Text, Loc ('Types'), Array.from(materialTypes).join(', ')));
        }

        this.Resize ();
    }

    AddPropertyGroup (table, propertyGroup)
    {
        let row = AddDiv (table, 'ov_property_table_row group', propertyGroup.name);
        row.setAttribute ('title', propertyGroup.name);
    }

    AddProperty (table, property)
    {
        let row = AddDiv (table, 'ov_property_table_row');
        let nameColumn = AddDiv (row, 'ov_property_table_cell ov_property_table_name', property.name + ':');
        let valueColumn = AddDiv (row, 'ov_property_table_cell ov_property_table_value');
        nameColumn.setAttribute ('title', property.name);
        this.DisplayPropertyValue (property, valueColumn);
        return row;
    }

    AddPropertyInGroup (table, property)
    {
        let row = this.AddProperty (table, property);
        row.classList.add ('ingroup');
    }

    AddCalculatedProperty (table, name, calculateValue)
    {
        let row = AddDiv (table, 'ov_property_table_row');
        let nameColumn = AddDiv (row, 'ov_property_table_cell ov_property_table_name', name + ':');
        let valueColumn = AddDiv (row, 'ov_property_table_cell ov_property_table_value');
        nameColumn.setAttribute ('title', name);

        let calculateButton = AddDiv (valueColumn, 'ov_property_table_button', Loc ('Calculate...'));
        calculateButton.addEventListener ('click', () => {
            ClearDomElement (valueColumn);
            valueColumn.innerHTML = Loc ('Please wait...');
            RunTaskAsync (() => {
                let propertyValue = calculateValue ();
                if (propertyValue === null) {
                    valueColumn.innerHTML = '-';
                } else {
                    this.DisplayPropertyValue (propertyValue, valueColumn);
                }
            });
        });
    }

    DisplayPropertyValue (property, targetDiv)
    {
        ClearDomElement (targetDiv);
        let valueHtml = null;
        let valueTitle = null;
        if (property.type === PropertyType.Text) {
            if (IsUrl (property.value)) {
                valueHtml = '<a target="_blank" href="' + property.value + '">' + property.value + '</a>';
                valueTitle = property.value;
            } else {
                valueHtml = PropertyToString (property);
            }
        } else if (property.type === PropertyType.Color) {
            let hexString = '#' + RGBColorToHexString (property.value);
            let colorCircle = CreateInlineColorCircle (property.value);
            targetDiv.appendChild (colorCircle);
            AddDomElement (targetDiv, 'span', null, hexString);
        } else {
            valueHtml = PropertyToString (property);
        }
        if (valueHtml !== null) {
            targetDiv.innerHTML = valueHtml;
            targetDiv.setAttribute ('title', valueTitle !== null ? valueTitle : valueHtml);
        }
    }
}
