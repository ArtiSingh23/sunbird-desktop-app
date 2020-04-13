import { Component, OnInit, Output, EventEmitter, Input, OnDestroy, ViewChild } from '@angular/core';
import { ResourceService, ToasterService } from '@sunbird/shared';
import { OrgDetailsService, ChannelService, FrameworkService } from '@sunbird/core';

import { FormGroup, Validators, FormBuilder, FormControl } from '@angular/forms';
import { OnboardingService } from '../../../offline/services/onboarding/onboarding.service';
import * as _ from 'lodash-es';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { TelemetryService } from '@sunbird/telemetry';
import { PublicPlayerService } from '@sunbird/public';

@Component({
  selector: 'app-update-content-preference',
  templateUrl: './update-content-preference.component.html',
  styleUrls: ['./update-content-preference.component.scss']
})
export class UpdateContentPreferenceComponent implements OnInit, OnDestroy {
  @ViewChild('modal') modal;
  contentPreferenceForm: FormGroup;
  boardOption = [];
  mediumOption = [];
  classOption = [];
  subjectsOption = [];
  frameworkCategories: any;
  frameworkDetails: any;
  @Input() userPreferenceData;
  @Output() dismissed = new EventEmitter<any>();
  public unsubscribe$ = new Subject<void>();
  constructor(
    public resourceService: ResourceService,
    private formBuilder: FormBuilder,
    public userService: OnboardingService,
    public orgDetailsService: OrgDetailsService,
    public channelService: ChannelService,
    public frameworkService: FrameworkService,
    public toasterService: ToasterService,
    public activatedRoute: ActivatedRoute,
    public telemetryService: TelemetryService,
    public publicPlayerService: PublicPlayerService
  ) { }
  ngOnInit() {
    this.frameworkDetails = this.userPreferenceData['framework'];
    this.createContentPreferenceForm();
    this.getCustodianOrg();
  }

  createContentPreferenceForm() {
    this.contentPreferenceForm = this.formBuilder.group({
      board: new FormControl(null, [Validators.required]),
      medium: new FormControl(null, [Validators.required]),
      class: new FormControl(null, [Validators.required]),
      subjects: new FormControl(null, []),
    });
  }

  getCustodianOrg() {
    this.orgDetailsService.getCustodianOrgDetails()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(data => {
        this.readChannel(_.get(data, 'result.response.value'));
      });
  }

  readChannel(custodianOrgId) {
    this.channelService.getFrameWork(custodianOrgId)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(data => {
        this.boardOption = this.frameworkService.getSortedFilters(_.get(data, 'result.channel.frameworks'), 'board');
        this.contentPreferenceForm.controls['board'].setValue(_.find(this.boardOption, { name: this.frameworkDetails.board }));
        this.onBoardChange();
      }, err => {
      });
  }

  onBoardChange(event?) {
    this.mediumOption = [];
    this.classOption = [];
    this.subjectsOption = [];
    this.clearForm(['medium', 'class', 'subjects']);
    if (this.contentPreferenceForm.value.board) {
      this.frameworkService.getFrameworkCategories(_.get(this.contentPreferenceForm.value.board, 'identifier'))
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe((data) => {
          if (data && _.get(data, 'result.framework.categories')) {
            this.frameworkCategories = _.get(data, 'result.framework.categories');
            const board = _.find(this.frameworkCategories, (element) => {
              return element.code === 'board';
            });
            this.mediumOption = this.frameworkService.getSortedFilters(this.userService.getAssociationData(board.terms, 'medium',
            this.frameworkCategories), 'medium');
            if (this.contentPreferenceForm.value.board.name === this.frameworkDetails['board'] && !event) {
            this.contentPreferenceForm.controls['medium'].setValue(this.filterContent(this.mediumOption, this.frameworkDetails['medium']));
            }
            this.onMediumChange();
          }
        }, err => {
        });
    }

  }
  filterContent(filterArray, content) {
    const array = [];
    _.forEach(content, (data) => {
      const filter = this.getSelecteddata(filterArray, data);
      array.push(filter);
    });
    return array;
  }
  getSelecteddata(filterArray, content) {
    return _.find(filterArray, { name: content });
  }

  clearForm(values) {
    _.forEach(values, value => {
      this.contentPreferenceForm.controls[`${value}`].setValue('');
    });
  }

  onMediumChange(event?) {
    this.classOption = [];
    this.subjectsOption = [];
    if (event) {
      this.contentPreferenceForm.controls['medium'].setValue(event);
    }
    this.clearForm(['class', 'subjects']);
    if (!_.isEmpty(this.contentPreferenceForm.value.medium)) {
    this.classOption = this.frameworkService.getSortedFilters(this.userService.getAssociationData(this.contentPreferenceForm.value.medium,
      'gradeLevel', this.frameworkCategories), 'gradeLevel');
      if (this.contentPreferenceForm.value.board.name === this.frameworkDetails['board'] && !event) {
        this.contentPreferenceForm.controls['class'].setValue(this.filterContent(this.classOption, this.frameworkDetails['gradeLevel']));
      }
      this.onClassChange();
    }
  }

  onClassChange(event?) {
    this.subjectsOption = [];
    if (event) {
      this.contentPreferenceForm.controls['class'].setValue(event);
    }
    this.clearForm(['subjects']);
    if (!_.isEmpty(this.contentPreferenceForm.value.class)) {
    this.subjectsOption = this.frameworkService.getSortedFilters(this.userService.getAssociationData(this.contentPreferenceForm.value.class,
      'subject', this.frameworkCategories), 'subject');
      if (this.contentPreferenceForm.value.board.name === this.frameworkDetails['board'] && !event) {
        this.contentPreferenceForm.controls['subjects'].setValue(
          _.compact(this.filterContent(this.subjectsOption, this.frameworkDetails['subjects'])));
      }
    }
  }

  onSubjectChange(event) {
    this.contentPreferenceForm.controls['subjects'].setValue(event);
  }

  updateUser() {
  this.setTelemetryData();
    const requestData = {
      'request': {
        'identifier': _.get(this.userPreferenceData, '_id'),
        'name': _.get(this.userPreferenceData, 'name'),
        'framework': {
          'board': _.get(this.contentPreferenceForm.value.board, 'name'),
          'medium': _.map(this.contentPreferenceForm.value.medium, 'name'),
          'gradeLevel': _.map(this.contentPreferenceForm.value.class, 'name'),
          'subjects': _.map(this.contentPreferenceForm.value.subjects, 'name')
        }
      }
    };
    this.userPreferenceData.framework.board = requestData.request.framework.board;
    this.userPreferenceData.framework.medium = requestData.request.framework.medium;
    this.userPreferenceData.framework.gradeLevel = requestData.request.framework.gradeLevel;
    this.userPreferenceData.framework.subjects = requestData.request.framework.subjects;

    this.userService.updateUser(requestData)
    .pipe(takeUntil(this.unsubscribe$))
    .subscribe(() => {
      this.updateFilters();
        this.closeModal(this.userPreferenceData);
        this.userService.userSelectedFilters = this.userPreferenceData.framework;
        this.toasterService.success(this.resourceService.messages.smsg.m0058);

      }, error => {
        this.toasterService.error(this.resourceService.messages.emsg.m0022);
      });
  }

  updateFilters() {
    this.userService.getUser();
    const filters = _.pick(this.userPreferenceData.framework, ['board', 'medium', 'gradeLevel']);
    filters.board = [filters.board];
    filters.appliedFilters = true;
    this.publicPlayerService.libraryFilters = filters;
  }

   closeModal(requestData?) {
    this.modal.deny();
    this.dismissed.emit(requestData);
  }
  setTelemetryData() {
    const interactData = {
      context: {
        env: this.activatedRoute.snapshot.data.telemetry.env,
        cdata: []
      },
      edata: {
        id: 'updating_user_preference',
        type: 'click',
        pageid: this.activatedRoute.snapshot.data.telemetry.pageid,
        extra: {
          'framework': {
            '_id': _.get(this.userPreferenceData, '_id'),
            'board': _.get(this.contentPreferenceForm.value.board, 'name'),
            'medium': _.map(this.contentPreferenceForm.value.medium, 'name'),
            'gradeLevel': _.map(this.contentPreferenceForm.value.class, 'name'),
            'subjects': _.map(this.contentPreferenceForm.value.subjects, 'name')
          }
        }
      }
    };
    this.telemetryService.interact(interactData);
  }
  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
