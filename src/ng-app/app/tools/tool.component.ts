import { ChangeCryptPasswordComponent } from '../change-crypt-password/change-crypt-password.component';
import { ShutdownTimerComponent } from '../shutdown-timer/shutdown-timer.component';
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

import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompatibilityService } from '../compatibility.service';
import { SharedModule } from '../shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule, ChangeCryptPasswordComponent, ShutdownTimerComponent], 
    selector: 'app-tools',
    templateUrl: './tools.component.html',
    styleUrls: ['./tools.component.scss'],
    
})
export class ToolsComponent {
    compat = inject(CompatibilityService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);



    gotoComponent(component: string) {
        this.router.navigate([ component ], { relativeTo: this.route.parent });
    }
}