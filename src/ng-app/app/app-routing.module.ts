import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProfileManagerComponent } from './profile-manager/profile-manager.component';
import { SupportComponent } from './support/support.component';
import { InfoComponent } from './info/info.component';
import { CpuDashboardComponent } from './cpu-dashboard/cpu-dashboard.component';

const routes: Routes = [
  { path: '', redirectTo: 'profile-manager', pathMatch: 'full' },
  { path: 'profile-manager', component: ProfileManagerComponent },
  { path: 'profile-manager/:profileName', component: ProfileManagerComponent },
  { path: 'support', component: SupportComponent },
  { path: 'info', component: InfoComponent },
  { path: 'cpu-dashboard', component: CpuDashboardComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
