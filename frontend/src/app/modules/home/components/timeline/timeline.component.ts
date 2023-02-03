import { Component } from '@angular/core';
import { Ticket } from 'src/app/classes/interfaces';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent {

  tickets: Ticket[];
  expanded: string[] = [];

  constructor() {
    this.tickets = [
      {
        id: "1",
        title: 'Ticket 1',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris porttitor nunc a ultricies porta. Curabitur faucibus tristique erat quis condimentum. Quisque condimentum vel ligula a elementum. Duis accumsan nunc non nibh venenatis congue. Proin tellus diam, fringilla non mattis quis, laoreet id massa. Proin volutpat aliquet lectus nec eleifend. Sed sed sapien neque.',
        status: 'open',
        created: new Date(),
        customer: true,
        parent: null,
        device: ""
      },
      {
        id: "1.1",
        title: 'Ticket 1.1',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris porttitor nunc a ultricies porta. Curabitur faucibus tristique erat quis condimentum. Quisque condimentum vel ligula a elementum. Duis accumsan nunc non nibh venenatis congue. Proin tellus diam, fringilla non mattis quis, laoreet id massa. Proin volutpat aliquet lectus nec eleifend. Sed sed sapien neque.',
        status: 'open',
        created: new Date(),
        parent: "1",
        customer: false,
        device: ""
      },
      {
        id: "2",
        title: 'Ticket 2',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris porttitor nunc a ultricies porta. Curabitur faucibus tristique erat quis condimentum. Quisque condimentum vel ligula a elementum. Duis accumsan nunc non nibh venenatis congue. Proin tellus diam, fringilla non mattis quis, laoreet id massa. Proin volutpat aliquet lectus nec eleifend. Sed sed sapien neque.',
        status: 'open',
        created: new Date(),
        customer: true,
        parent: null,
        device: ""
      },
      {
        id: "2.1",
        title: 'Ticket 2.1',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris porttitor nunc a ultricies porta. Curabitur faucibus tristique erat quis condimentum. Quisque condimentum vel ligula a elementum. Duis accumsan nunc non nibh venenatis congue. Proin tellus diam, fringilla non mattis quis, laoreet id massa. Proin volutpat aliquet lectus nec eleifend. Sed sed sapien neque.',
        status: 'open',
        created: new Date(),
        parent: "2",
        customer: false,
        device: ""
      },
      {
        id: "2.2",
        title: 'Ticket 2.2',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris porttitor nunc a ultricies porta. Curabitur faucibus tristique erat quis condimentum. Quisque condimentum vel ligula a elementum. Duis accumsan nunc non nibh venenatis congue. Proin tellus diam, fringilla non mattis quis, laoreet id massa. Proin volutpat aliquet lectus nec eleifend. Sed sed sapien neque.',
        status: 'open',
        created: new Date(),
        parent: "2",
        customer: true,
        device: ""
      }
    ]
  }

  toggle(parent: string | null) {
    if (parent === null) return;
    if (this.expanded.includes(parent)) {
      this.expanded = this.expanded.filter(x => x !== parent);
    } else
      this.expanded.push(parent);
  }
}
