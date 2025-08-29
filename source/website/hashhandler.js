import { CreateModelUrlParameters, CreateUrlParser, CreateUrlBuilder } from '../engine/parameters/parameterlist.js';

export class HashHandler
{
    constructor ()
    {
        this.skipNextEvent = false;
        this.eventListener = null;
    }

    SetEventListener (eventListener)
    {
        this.eventListener = eventListener;
        window.onhashchange = this.OnChange.bind (this);
    }

    SkipNextEventHandler ()
    {
        this.skipNextEvent = true;
    }

    HasHash ()
    {
        let hash = this.GetHash ();
        return hash.length > 0;
    }

    ClearHash ()
    {
        this.SetHash ('');
    }

    GetModelFilesFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetModelUrls ();
    }

    SetModelFilesToHash (files)
    {
        let params = CreateModelUrlParameters (files);
        this.SetHash (params);
    }

    GetCameraFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetCamera ();
    }

    GetProjectionModeFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetProjectionMode ();
    }

    GetBackgroundFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetBackgroundColor ();
    }

    GetEnvironmentSettingsFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetEnvironmentSettings ();
    }

    GetDefaultColorFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetDefaultColor ();
    }

    GetDefaultLineColorFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetDefaultLineColor ();
    }

    GetEdgeSettingsFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetEdgeSettings ();
    }

    GetSelectedObjectsFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetSelectedObjects ();
    }

    GetOpacityFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetOpacity ();
    }

    GetBearerTokenFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetBearerToken ();
    }

    GetFileExtensionFromHash ()
    {
        let parser = CreateUrlParser (this.GetHash ());
        return parser.GetFileExtension ();
    }

    SetSelectedObjectsToHash (selectedObjects)
    {
        let builder = CreateUrlBuilder ();
        builder.AddModelUrls (this.GetModelFilesFromHash ());

        // Preserve existing parameters
        let camera = this.GetCameraFromHash ();
        if (camera !== null) {
            builder.AddCamera (camera);
        }

        let projectionMode = this.GetProjectionModeFromHash ();
        if (projectionMode !== null) {
            builder.AddProjectionMode (projectionMode);
        }

        let backgroundColor = this.GetBackgroundFromHash ();
        if (backgroundColor !== null) {
            builder.AddBackgroundColor (backgroundColor);
        }

        let environmentSettings = this.GetEnvironmentSettingsFromHash ();
        if (environmentSettings !== null) {
            builder.AddEnvironmentSettings (environmentSettings);
        }

        let defaultColor = this.GetDefaultColorFromHash ();
        if (defaultColor !== null) {
            builder.AddDefaultColor (defaultColor);
        }

        let defaultLineColor = this.GetDefaultLineColorFromHash ();
        if (defaultLineColor !== null) {
            builder.AddDefaultLineColor (defaultLineColor);
        }

        let edgeSettings = this.GetEdgeSettingsFromHash ();
        if (edgeSettings !== null) {
            builder.AddEdgeSettings (edgeSettings);
        }

        // Add new parameters
        if (selectedObjects && selectedObjects.length > 0) {
            builder.AddSelectedObjects (selectedObjects);
        }

        let currentOpacity = this.GetOpacityFromHash ();
        if (currentOpacity !== null) {
            builder.AddOpacity (currentOpacity);
        }

        this.SetHash (builder.GetParameterList ());
    }

        SetOpacityToHash (opacity)
    {
        let builder = CreateUrlBuilder ();
        builder.AddModelUrls (this.GetModelFilesFromHash ());

        // Preserve existing parameters
        let camera = this.GetCameraFromHash ();
        if (camera !== null) {
            builder.AddCamera (camera);
        }

        let projectionMode = this.GetProjectionModeFromHash ();
        if (projectionMode !== null) {
            builder.AddProjectionMode (projectionMode);
        }

        let backgroundColor = this.GetBackgroundFromHash ();
        if (backgroundColor !== null) {
            builder.AddBackgroundColor (backgroundColor);
        }

        let environmentSettings = this.GetEnvironmentSettingsFromHash ();
        if (environmentSettings !== null) {
            builder.AddEnvironmentSettings (environmentSettings);
        }

        let defaultColor = this.GetDefaultColorFromHash ();
        if (defaultColor !== null) {
            builder.AddDefaultColor (defaultColor);
        }

        let defaultLineColor = this.GetDefaultLineColorFromHash ();
        if (defaultLineColor !== null) {
            builder.AddDefaultLineColor (defaultLineColor);
        }

        let edgeSettings = this.GetEdgeSettingsFromHash ();
        if (edgeSettings !== null) {
            builder.AddEdgeSettings (edgeSettings);
        }

        let selectedObjects = this.GetSelectedObjectsFromHash ();
        if (selectedObjects && selectedObjects.length > 0) {
            builder.AddSelectedObjects (selectedObjects);
        }

        // Add new opacity
        if (opacity !== null && opacity !== undefined) {
            builder.AddOpacity (opacity);
        }

        this.SetHash (builder.GetParameterList ());
    }

    SetBearerTokenToHash (bearerToken)
    {
        let builder = CreateUrlBuilder ();
        builder.AddModelUrls (this.GetModelFilesFromHash ());

        // Preserve existing parameters
        let camera = this.GetCameraFromHash ();
        if (camera !== null) {
            builder.AddCamera (camera);
        }

        let projectionMode = this.GetProjectionModeFromHash ();
        if (projectionMode !== null) {
            builder.AddProjectionMode (projectionMode);
        }

        let backgroundColor = this.GetBackgroundFromHash ();
        if (backgroundColor !== null) {
            builder.AddBackgroundColor (backgroundColor);
        }

        let environmentSettings = this.GetEnvironmentSettingsFromHash ();
        if (environmentSettings !== null) {
            builder.AddEnvironmentSettings (environmentSettings);
        }

        let defaultColor = this.GetDefaultColorFromHash ();
        if (defaultColor !== null) {
            builder.AddDefaultColor (defaultColor);
        }

        let defaultLineColor = this.GetDefaultLineColorFromHash ();
        if (defaultLineColor !== null) {
            builder.AddDefaultLineColor (defaultLineColor);
        }

        let edgeSettings = this.GetEdgeSettingsFromHash ();
        if (edgeSettings !== null) {
            builder.AddEdgeSettings (edgeSettings);
        }

        let selectedObjects = this.GetSelectedObjectsFromHash ();
        if (selectedObjects && selectedObjects.length > 0) {
            builder.AddSelectedObjects (selectedObjects);
        }

        let currentOpacity = this.GetOpacityFromHash ();
        if (currentOpacity !== null) {
            builder.AddOpacity (currentOpacity);
        }

        // Add new bearer token
        if (bearerToken !== null && bearerToken !== undefined && bearerToken.length > 0) {
            builder.AddBearerToken (bearerToken);
        }

        // Add new file extension
        let currentFileExtension = this.GetFileExtensionFromHash ();
        if (currentFileExtension !== null) {
            builder.AddFileExtension (currentFileExtension);
        }

        this.SetHash (builder.GetParameterList ());
    }

    GetHash ()
    {
        return window.location.hash.substring (1);
    }

    SetHash (hash)
    {
        window.location.hash = hash;
    }

    OnChange ()
    {
        if (this.skipNextEvent) {
            this.skipNextEvent = false;
            return;
        }
        this.eventListener ();
    }
}
