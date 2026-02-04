

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

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProfileConflictComponent, IProfileConflictDialogResult } from "./profile-conflict-dialog.component";
import { map, max, take } from 'rxjs/operators';
import { ITccProfile } from 'src/common/models/TccProfile';




@Injectable()
export class ProfileConflictDialogService {  
  
    constructor(private dialog: MatDialog) { }  
    dialogRef: MatDialogRef<ProfileConflictComponent>;
  
  private open(oldProfile: ITccProfile, newProfile: ITccProfile) 
  {
    this.dialogRef = this.dialog.open(ProfileConflictComponent, {    
        data: {
          oldProfile: oldProfile,
          newProfile: newProfile
        }
   }); 
  }    



  private closed(): Observable<IProfileConflictDialogResult> 
  {
    return this.dialogRef.afterClosed().pipe(take(1), map(res => {
        return res;
      }
    ));
  }

  public async openConflictModal(oldProfile: ITccProfile, importedProfile: ITccProfile,)
    {
        return new Promise<IProfileConflictDialogResult>((resolve, reject) => {
            this.open(oldProfile,importedProfile);

            this.closed().subscribe(confirmed => {
                if (confirmed) {
                  resolve(confirmed);
                }
                else
                {
                    reject({"action":"canceled","newName":""});
                }
             });

        });
    }


}