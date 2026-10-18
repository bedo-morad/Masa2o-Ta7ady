import { Component, input, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WhoPictureEditor, WHO_PICTURE_EDITOR_SIZE } from './whopicture-editor';
@Component({ selector: 'app-whopicture-editor', standalone: true, imports: [FormsModule], encapsulation: ViewEncapsulation.None, styles: [`app-whopicture-editor form{display:flex;flex-direction:column;gap:.5rem}app-whopicture-editor input{min-height:48px;padding:.65rem .8rem;border:1px solid var(--pitch-line);border-radius:10px;background:var(--pitch-surface);color:var(--pitch-ink)}app-whopicture-editor .lineup{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.45rem}`], template: `
<form [class.add]="mode() === 'add'" [class.edit]="mode() === 'edit'" class="column" (ngSubmit)="submit()">
 <input [ngModel]="mode()==='add'?editor().newPhotoTitle():editor().editPhotoTitle()" (ngModelChange)="setTitle($event)" [name]="mode()==='add'?'ntitle':'editPhotoTitle'" placeholder="العنوان — الأهلي 2021 نهائي دوري أبطال أفريقيا" aria-label="عنوان الصورة" />
 <input [ngModel]="mode()==='add'?editor().newPhotoUrl():editor().editPhotoUrl()" (ngModelChange)="setUrl($event)" [name]="mode()==='add'?'nurl':'editPhotoUrl'" placeholder="رابط الصورة — https://…" aria-label="رابط الصورة" />
 <ol class="lineup">@for (slot of slots; track slot; let i=$index) { <li><input class="player-box" [ngModel]="players()[i]" (ngModelChange)="setPlayer(i,$event)" [name]="(mode()==='add'?'nwp':'ewp')+slot" placeholder="اسم لاعب" [attr.aria-label]="(mode()==='add'?'اللاعب رقم ':'تعديل اللاعب رقم ')+slot+' في الصورة'" /></li> }</ol>
 <div class="edit-actions"><button type="submit" [class.save]="mode()==='edit'"><i class="fa-solid" [class.fa-plus]="mode()==='add'" [class.fa-check]="mode()==='edit'"></i> {{mode()==='add'?'إضافة صورة':'حفظ'}}</button>@if(mode()==='edit'){<button type="button" class="cancel" (click)="editor().cancel()">إلغاء</button>}</div>
</form>` })
export class WhoPictureEditorComponent {
 readonly editor=input.required<WhoPictureEditor>(); readonly mode=input<'add'|'edit'>('add'); readonly id=input<number>(); readonly slots=Array.from({length:WHO_PICTURE_EDITOR_SIZE},(_,i)=>i+1);
 players():string[]{const e=this.editor(); return this.mode()==='add'?e.newPhotoPlayers():e.editPhotoPlayers();}
 setTitle(v:string):void{const e=this.editor();(this.mode()==='add'?e.newPhotoTitle:e.editPhotoTitle).set(v);}
 setUrl(v:string):void{const e=this.editor();(this.mode()==='add'?e.newPhotoUrl:e.editPhotoUrl).set(v);}
 setPlayer(i:number,v:string):void{const e=this.editor();(this.mode()==='add'?e.setNewPlayer.bind(e):e.setEditPlayer.bind(e))(i,v);}
 submit():void{const e=this.editor();void(this.mode()==='add'?e.add():e.save(this.id()!));}
}
