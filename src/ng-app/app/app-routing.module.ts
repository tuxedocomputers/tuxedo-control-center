/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */
import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { LoaderResolver } from "./loader.resolver";
import {
    ChargingProfilesAvailableResolver,
    ForceYUV420OutputSwitchResolver,
} from "./settings.resolver";

import { ProfileManagerComponent } from "./profile-manager/profile-manager.component";
import { SupportComponent } from "./support/support.component";
import { InfoComponent } from "./info/info.component";
import { CpuDashboardComponent } from "./cpu-dashboard/cpu-dashboard.component";
import { KeyboardBacklightComponent } from "./keyboard-backlight/keyboard-backlight.component";
import { ToolsComponent } from "./tools/tool.component";
import { GlobalSettingsComponent } from "./global-settings/global-settings.component";
import { MainGuiComponent } from "./main-gui/main-gui.component";
import { AquarisControlComponent } from "./aquaris-control/aquaris-control.component";
import { WebcamSettingsComponent } from "./webcam-settings/webcam-settings.component";
import { WebcamPreviewComponent } from "./webcam-preview/webcam-preview.component";
import { WebcamSettingsGuard } from "./webcam.service";
import { TomteGuiComponent } from "./tomte-gui/tomte-gui.component";
import { PrimeDialogComponent } from "./prime-dialog/prime-dialog.component";

const routes: Routes = [
    { path: "", redirectTo: "/main-gui/cpu-dashboard", pathMatch: "full" },
    {
        path: "main-gui",
        component: MainGuiComponent,
        resolve: { loaded: LoaderResolver },
        children: [
            { path: "profile-manager", component: ProfileManagerComponent },
            {
                path: "profile-manager/:profileId",
                component: ProfileManagerComponent,
            },
            { path: "support", component: SupportComponent },
            { path: "info", component: InfoComponent },
            { path: "cpu-dashboard", component: CpuDashboardComponent },
            { path: "tools", component: ToolsComponent },
            {
                path: "keyboard-backlight",
                component: KeyboardBacklightComponent,
            },
            {
                path: "camera-settings",
                component: WebcamSettingsComponent,
                canDeactivate: [WebcamSettingsGuard],
            },
            {
                path: "global-settings",
                resolve: {
                    forceYUV420OutputSwitchAvailable:
                        ForceYUV420OutputSwitchResolver,
                    chargingProfilesAvailable:
                        ChargingProfilesAvailableResolver,
                },
                component: GlobalSettingsComponent,
            },
            {
                path: "global-settings/:routingFromDashboard",
                resolve: {
                    forceYUV420OutputSwitchAvailable:
                        ForceYUV420OutputSwitchResolver,
                    chargingProfilesAvailable:
                        ChargingProfilesAvailableResolver,
                },
                component: GlobalSettingsComponent,
            },
            { path: "aquaris-control", component: AquarisControlComponent },
            { path: "tomte-gui", component: TomteGuiComponent },

        ],
    },
    { path: "webcam-preview", component: WebcamPreviewComponent },
    { path: "aquaris-control", component: AquarisControlComponent },
    {
        path: "prime-dialog",
        component: PrimeDialogComponent,
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
