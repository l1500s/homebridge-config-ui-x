import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Subscription, interval } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { IoNamespace, WsService } from '@/app/core/ws.service';

@Component({
  templateUrl: './memory-widget.component.html',
  styleUrls: ['./memory-widget.component.scss'],
})
export class MemoryWidgetComponent implements OnInit, OnDestroy {
  @Input() public widget;

  @ViewChild(BaseChartDirective, { static: true }) public chart: BaseChartDirective;
  @ViewChild('widgetbackground', { static: true }) private widgetBackground: ElementRef;

  public totalMemory: number;
  public freeMemory: number;
  public refreshInterval: number;
  public historyItems: number;

  public lineChartType: ChartConfiguration['type'] = 'line';

  public lineChartData: ChartConfiguration['data'] = {
    datasets: [{ data: [] }],
  };

  public lineChartLabels = [];

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    elements: {
      point: {
        radius: 0,
      },
      line: {
        tension: 0.4,
        backgroundColor: 'rgba(148,159,177,0.2)',
        borderColor: 'rgba(148,159,177,0.2)',
        fill: 'origin',
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y:
        {
          display: false,
          max: 100,
          min: 0,
        },
    },
  };

  private io: IoNamespace;
  private intervalSubscription: Subscription;

  constructor(
    private $ws: WsService,
    public $auth: AuthService,
  ) {}

  ngOnInit() {
    this.io = this.$ws.getExistingNamespace('status');

    // lookup the chart color based on the current theme
    const userColor = getComputedStyle(this.widgetBackground.nativeElement).backgroundColor;
    if (userColor) {
      this.lineChartOptions.elements.line.backgroundColor = userColor;
      this.lineChartOptions.elements.line.borderColor = userColor;
    }

    this.io.connected.subscribe(async () => {
      this.getServerMemoryInfo();
    });

    if (this.io.socket.connected) {
      this.getServerMemoryInfo();
    }

    // Interval and history items should be in [1, 60]
    if (!this.widget.refreshInterval) {
      this.widget.refreshInterval = 10;
    }
    if (!this.widget.historyItems) {
      this.widget.historyItems = 60;
    }
    this.refreshInterval = Math.min(60, Math.max(1, parseInt(this.widget.refreshInterval, 10)));
    this.historyItems = Math.min(60, Math.max(1, parseInt(this.widget.historyItems, 10)));

    this.intervalSubscription = interval(this.refreshInterval * 1000).subscribe(() => {
      if (this.io.socket.connected) {
        this.getServerMemoryInfo();
      }
    });
  }

  getServerMemoryInfo() {
    this.io.request('get-server-memory-info').subscribe((data) => {
      this.updateData(data);
      this.chart.update();
    });
  }

  updateData(data) {
    this.totalMemory = data.mem.total / 1024 / 1024 / 1024;
    this.freeMemory = data.mem.available / 1024 / 1024 / 1024;

    const dataLength = Object.keys(this.lineChartData.datasets[0].data).length;
    if (!dataLength) {
      this.initializeChartData(data);
    } else {
      this.updateChartData(data, dataLength);
    }
  }

  initializeChartData(data) {
    const items = data.memoryUsageHistory.slice(-this.historyItems);
    this.lineChartData.datasets[0].data = { ...items };
    this.lineChartLabels = items.map(() => 'point');
  }

  updateChartData(data, dataLength) {
    this.lineChartData.datasets[0].data[dataLength] = data.memoryUsageHistory.slice(-1)[0];
    this.lineChartLabels.push('point');

    if (dataLength >= this.historyItems) {
      this.shiftChartData();
    }
  }

  shiftChartData() {
    const newItems = {};
    Object.keys(this.lineChartData.datasets[0].data).forEach((key, index, array) => {
      if (index + 1 < array.length) {
        newItems[key] = this.lineChartData.datasets[0].data[array[index + 1]];
      }
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.lineChartData.datasets[0].data = newItems;
    this.lineChartLabels = this.lineChartLabels.slice(1);
  }

  ngOnDestroy() {
    this.intervalSubscription.unsubscribe();
  }
}
