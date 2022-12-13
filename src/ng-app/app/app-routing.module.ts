/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Routes, RouterModule } from '@angular/router';

import { ProfileManagerComponent } from './profile-manager/profile-manager.component';
import { SupportComponent } from './support/support.component';
import { InfoComponent } from './info/info.component';
import { CpuDashboardComponent } from './cpu-dashboard/cpu-dashboard.component';
import { ToolsComponent } from './tools/tool.component';
import { GlobalSettingsComponent } from './global-settings/global-settings.component';
import { MainGuiComponent } from './main-gui/main-gui.component';
import { AquarisControlComponent } from './aquaris-control/aquaris-control.component';
import { CameraSettingsComponent } from './camera-settings/camera-settings.component';
import { WebcamPreviewComponent } from './webcam-preview/webcam-preview.component';

const routes: Routes = [
    { path: '', redirectTo: '/main-gui/cpu-dashboard', pathMatch: 'full' },
    {
        path: 'main-gui', component: MainGuiComponent,
        children: [
            { path: 'profile-manager', component: ProfileManagerComponent },
            { path: 'profile-manager/:profileId', component: ProfileManagerComponent },
            { path: 'support', component: SupportComponent },
            { path: 'info', component: InfoComponent },
            { path: 'cpu-dashboard', component: CpuDashboardComponent },
            { path: 'tools', component: ToolsComponent },
            { path: 'camera-settings', component: CameraSettingsComponent },
            { path: 'global-settings', component: GlobalSettingsComponent },
            { path: 'aquaris-control', component: AquarisControlComponent }
        ]
    },
    { path: 'webcam-preview', component: WebcamPreviewComponent },
    { path: 'aquaris-control', component: AquarisControlComponent },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule]
})
export class AppRoutingModule { }
