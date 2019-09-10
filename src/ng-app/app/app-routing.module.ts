import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CpuSettingsComponent } from './cpu-settings/cpu-settings.component';
import { ProfileManagerComponent } from './profile-manager/profile-manager.component';
import { DisplaySettingsComponent } from './display-settings/display-settings.component';
import { SupportComponent } from './support/support.component';

const routes: Routes = [
  { path: '', redirectTo: 'profile-manager', pathMatch: 'full' },
  { path: 'cpu-settings', component: CpuSettingsComponent },
  { path: 'profile-manager', component: ProfileManagerComponent },
  { path: 'profile-manager/:profileName', component: ProfileManagerComponent },
  { path: 'display-settings', component: DisplaySettingsComponent },
  { path: 'support', component: SupportComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
