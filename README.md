# IAMTech

Website for IAMTech Phone and Laptop Repair, Saddul St. Purok 7, Salay, Echague, Isabela.

## Features

### For customers

- **Home page** with services, opening hours, location, and contact by SMS, WhatsApp, or email.
- **Set a repair appointment online:** choose the device type, describe the problem, then pick a date and a free time slot. Taken slots are hidden, and two people can never get the same slot.
- **Review before sending:** a summary of the appointment to confirm first.
- **No account needed:** each appointment gets its own private link and a short ticket number.
- **Repair ticket page** that shows progress: Requested, Quoted, Confirmed, Repaired.
- **Quote before paying:** see the repair price, the 20% downpayment, and the balance to pay at the shop.
- **GCash downpayment:** copy the GCash number, or scan or save the QR code, then submit the GCash reference number.
- **Decline a quote** to release the time slot.
- **Works on phones**, including links opened inside Messenger or Facebook.

### For staff

- **Staff sign-in**; only admin accounts can see appointments.
- **Repair queue** with tabs for Pending, Quoted, Accepted, Done, and Cancelled, each with a count and its own color. The Quoted tab shows how many customers have already paid.
- **Date filter**; without one, the queue shows the last 30 days and everything upcoming.
- **Appointment details** in a pop-up: customer contact, device, problem, price, and GCash reference.
- **Actions:** send a quote (the downpayment is shown as you type), confirm payment, mark done, or cancel.
- **Copy customer link** to send customers their appointment page.
- **Confirmations and messages:** every action asks first and reports when it's done or if it failed.
- **Stays current:** the queue refreshes when you come back to the page, for example after checking GCash.

### Data protection

- Customer details are visible only to staff, and only staff can set prices or confirm payments. This is enforced by the database, not just the website.

## Documentation

Setup, architecture, and deployment are in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md). Decisions and progress are in [`docs/PLAN.md`](docs/PLAN.md) and [`docs/CHANGELOG.md`](docs/CHANGELOG.md).
