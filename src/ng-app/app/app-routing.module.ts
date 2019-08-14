import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CpuSettingsComponent } from './cpu-settings/cpu-settings.component';

const routes: Routes = [
  { path: '', component: CpuSettingsComponent },
  { path: 'cpu-settings', component: CpuSettingsComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
