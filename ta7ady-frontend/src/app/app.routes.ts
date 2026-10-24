import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PasswordComponent } from './password/password.component';
import { ActingComponent } from './acting/acting.component';
import { IhbidComponent } from './ihbid/ihbid.component';
import { OffsideComponent } from './offside/offside.component';
import { Top10Component } from './top10/top10.component';
import { ScoresheetComponent } from './scoresheet/scoresheet.component';
import { RiskComponent } from './risk/risk.component';
import { BankComponent } from './bank/bank.component';
import { AnameenComponent } from './anameen/anameen.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'password', component: PasswordComponent },
  { path: 'acting', component: ActingComponent },
  { path: 'ihbid', component: IhbidComponent },
  { path: 'offside', component: OffsideComponent },
  { path: 'top10', component: Top10Component },
  { path: 'scoresheet', component: ScoresheetComponent },
  { path: 'risk', component: RiskComponent },
  { path: 'bank', component: BankComponent },
  { path: 'anameen', component: AnameenComponent },
  {
    path: 'game-wheel',
    loadComponent: () =>
      import('./game-wheel/game-wheel.component').then((m) => m.GameWheelComponent),
  },
  {
    path: 'whopicture',
    loadComponent: () =>
      import('./whopicture/whopicture.component').then((m) => m.WhopictureComponent),
  },
  {
    path: 'manage',
    loadComponent: () => import('./manage/manage.component').then((m) => m.ManageComponent),
  },
  { path: '**', redirectTo: '' },
];
