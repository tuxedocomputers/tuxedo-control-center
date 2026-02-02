/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { NgModule } from '@angular/core';
import { RouterModule, type Routes } from '@angular/router';
import { AptInstalledResolver } from './apt.resolver';
import { AquarisControlComponent } from './aquaris-control/aquaris-control.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import {
    AmdGpuCountResolver,
    CpuVendorResolver,
    DGpuStatusResolver,
    IGpuStatusResolver,
    PowerStateStatusResolver,
} from './dashboard.resolver';
import { GlobalSettingsComponent } from './global-settings/global-settings.component';
import { InfoComponent } from './info/info.component';
import { KeyboardBacklightComponent } from './keyboard-backlight/keyboard-backlight.component';
import { LoaderResolver } from './loader.resolver';
import { MainGuiComponent } from './main-gui/main-gui.component';
import { PrimeDialogComponent } from './prime-dialog/prime-dialog.component';
import { ProfileManagerComponent } from './profile-manager/profile-manager.component';
import {
    ChargingProfilesAvailableResolver,
    ForceYUV420OutputSwitchResolver,
    PrimeSelectAvailableResolver,
} from './settings.resolver';
import { SupportComponent } from './support/support.component';
import { TomteInstalledResolver } from './tomte.resolver';
import { TomteGuiComponent } from './tomte-gui/tomte-gui.component';
import { ToolsComponent } from './tools/tool.component';
import { WebcamSettingsGuard } from './webcam.guard';
import { WebcamPreviewComponent } from './webcam-preview/webcam-preview.component';
import { WebcamSettingsComponent } from './webcam-settings/webcam-settings.component';
import { WebfaiCreatorInstalledResolver } from './webfaiCreator.resolver';

const routes: Routes = [
    { path: '', redirectTo: '/main-gui/cpu-dashboard', pathMatch: 'full' },
    {
        path: 'main-gui',
        component: MainGuiComponent,
        resolve: { loaded: LoaderResolver },
        children: [
            { path: 'profile-manager', component: ProfileManagerComponent },
            {
                path: 'profile-manager/:profileId',
                component: ProfileManagerComponent,
            },
            {
                path: 'support',
                component: SupportComponent,
                resolve: {
                    aptInstalled: AptInstalledResolver,
                    webfaiCreatorInstalled: WebfaiCreatorInstalledResolver,
                },
            },
            { path: 'info', component: InfoComponent },
            {
                path: 'cpu-dashboard',
                component: DashboardComponent,
                resolve: {
                    powerStateStatus: PowerStateStatusResolver,
                    dGpuAvailable: DGpuStatusResolver,
                    iGpuAvailable: IGpuStatusResolver,
                    primeStatus: PrimeSelectAvailableResolver,
                    amdGpuCount: AmdGpuCountResolver,
                    cpuVendor: CpuVendorResolver,
                },
            },
            { path: 'tools', component: ToolsComponent },
            {
                path: 'keyboard-backlight',
                component: KeyboardBacklightComponent,
            },
            {
                path: 'camera-settings',
                component: WebcamSettingsComponent,
                canDeactivate: [WebcamSettingsGuard],
            },
            {
                path: 'global-settings',
                resolve: {
                    forceYUV420OutputSwitchAvailable: ForceYUV420OutputSwitchResolver,
                    chargingProfilesAvailable: ChargingProfilesAvailableResolver,
                    primeSelectAvailable: PrimeSelectAvailableResolver,
                    aptInstalled: AptInstalledResolver,
                },
                component: GlobalSettingsComponent,
            },
            {
                path: 'global-settings/:routingFromDashboard',
                resolve: {
                    forceYUV420OutputSwitchAvailable: ForceYUV420OutputSwitchResolver,
                    chargingProfilesAvailable: ChargingProfilesAvailableResolver,
                    primeSelectAvailable: PrimeSelectAvailableResolver,
                    aptInstalled: AptInstalledResolver,
                },
                component: GlobalSettingsComponent,
            },
            { path: 'aquaris-control', component: AquarisControlComponent },
            {
                path: 'tomte-gui',
                component: TomteGuiComponent,
                resolve: {
                    aptInstalled: AptInstalledResolver,
                    tomteInstalled: TomteInstalledResolver,
                },
            },
        ],
    },
    { path: 'webcam-preview', component: WebcamPreviewComponent },
    { path: 'aquaris-control', component: AquarisControlComponent },
    {
        path: 'prime-dialog',
        component: PrimeDialogComponent,
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
