import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CpuSettingsComponent } from './cpu-settings/cpu-settings.component';
import { ProfileManagerComponent } from './profile-manager/profile-manager.component';

const routes: Routes = [
  { path: '', redirectTo: 'cpu-settings', pathMatch: 'full' },
  { path: 'cpu-settings', component: CpuSettingsComponent },
  { path: 'profile-manager', component: ProfileManagerComponent },
  { path: 'profile-manager/:profileName', component: ProfileManagerComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
