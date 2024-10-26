import { ApiService } from '@/app/core/api.service'
import { Component, Input } from '@angular/core'
import { Router } from '@angular/router'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslateService } from '@ngx-translate/core'
import { ToastrService } from 'ngx-toastr'

@Component({
  templateUrl: './restart-homebridge.component.html',
})
export class RestartHomebridgeComponent {
  @Input() fullRestart = false

  constructor(
    public $activeModal: NgbActiveModal,
    private $api: ApiService,
    private $router: Router,
    private $toastr: ToastrService,
    private $translate: TranslateService,
  ) {}

  public onRestartHomebridgeClick() {
    if (!this.fullRestart) {
      this.$router.navigate(['/restart'])
      this.$activeModal.close()
      return
    }

    this.$api.put('/platform-tools/hb-service/set-full-service-restart-flag', {}).subscribe({
      next: () => {
        this.$router.navigate(['/restart'])
      },
      error: (error) => {
        console.error(error)
        this.$toastr.error(error.message, this.$translate.instant('toast.title_error'))
      },
    })
  }
}
