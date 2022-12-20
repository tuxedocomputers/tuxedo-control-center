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
import { WebcamGuardService } from './webcam.service';

const routes: Routes = [
    { path: '', redirectTo: '/main-gui/cpu-dashboard', pathMatch: 'full' },
    {
        path: 'main-gui', component: MainGuiComponent, canActivate: [WebcamGuardService],
        children: [
            { path: 'profile-manager', component: ProfileManagerComponent, canActivate: [WebcamGuardService] },
            { path: 'profile-manager/:profileId', component: ProfileManagerComponent, canActivate: [WebcamGuardService] },
            { path: 'support', component: SupportComponent, canActivate: [WebcamGuardService] },
            { path: 'info', component: InfoComponent, canActivate: [WebcamGuardService] },
            { path: 'cpu-dashboard', component: CpuDashboardComponent, canActivate: [WebcamGuardService] },
            { path: 'tools', component: ToolsComponent, canActivate: [WebcamGuardService] },
            { path: 'camera-settings', component: CameraSettingsComponent, canActivate: [WebcamGuardService] },
            { path: 'global-settings', component: GlobalSettingsComponent, canActivate: [WebcamGuardService] },
            { path: 'aquaris-control', component: AquarisControlComponent, canActivate: [WebcamGuardService] }
        ]
    },
    { path: 'webcam-preview', component: WebcamPreviewComponent, canActivate: [WebcamGuardService] },
    { path: 'aquaris-control', component: AquarisControlComponent, canActivate: [WebcamGuardService] },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule]
})
export class AppRoutingModule { }
