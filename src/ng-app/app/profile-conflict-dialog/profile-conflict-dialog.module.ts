

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


import {ProfileConflictComponent} from "./profile-conflict-dialog.component";
import { ProfileConflictDialogService } from "./profile-conflict-dialog.service";
import { CommonModule } from '@angular/common';
import { NgModule} from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
@NgModule({
    imports: [
        CommonModule,
        MatDialogModule
    ],
    declarations: [
        ProfileConflictComponent
    ],
    exports: [ProfileConflictComponent],
    entryComponents: [ProfileConflictComponent],
    providers: [ProfileConflictDialogService]
  })
  export class ProfileConflictModule {
  }
