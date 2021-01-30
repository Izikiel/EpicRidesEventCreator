import 'google-apps-script';

class Trip {
  startDate: Date;
  endDate: Date;
  location: string;
  destination: string;

  oneHour = 60*60*1000;
  dateRegex = "([\\d]{2}\\/[\\d]{2}\\/[\\d]{4})";
  timeRegex = "([\\d]+)\\:([\\d]+) ([A|P]M)";
  destinationRegex = "\\*Departure to (Whistler|Vancouver)\\:\\*";

  constructor(tripInfo: string) {
    this.setTripDates(tripInfo);
    this.destination = tripInfo.match(this.destinationRegex)[1];
    console.log(this.destination);
  }

  setTripDates(tripInfo: string) {
    let dateString = tripInfo.match(this.dateRegex)[0];
    this.startDate = new Date(dateString);
    let [hours, minutes] = this.getTripTime(tripInfo);
    this.startDate.setHours(hours, minutes);
    this.endDate = new Date(this.startDate.getTime() + 2 * this.oneHour);

    console.log(this.startDate);
    console.log(this.endDate);
  }

  getTripTime(tripInfo: string): [number, number] {
    let timeMatches = tripInfo.match(this.timeRegex);
    let hours = Number.parseInt(timeMatches[1]);
    let minutes = Number.parseInt(timeMatches[2]);
    if (timeMatches[3] == "PM") {
      hours += 12;
    }
    return [hours, minutes];
  }

  createEvent() {
    CalendarApp
      .getDefaultCalendar()
      .createEvent(
        "Bus to " + this.destination,
        this.startDate,
        this.endDate,
        )
      .addPopupReminder(30)
      .addPopupReminder(60);
  }
}

function getUnreadEpicRidesEmails(): GoogleAppsScript.Gmail.GmailThread[] {
  return GmailApp.search('from:(@epicrides.ca)').filter(gmailThread => gmailThread.isUnread());
}

function parseTrip(destination: string, email: GoogleAppsScript.Gmail.GmailThread): Trip {
  let message = email.getMessages()[0];

  let body = message.getPlainBody().split("\n");

  let destinationInfo = body.filter(s => s.search(destination) > 0)[0];
  return new Trip(destinationInfo);
}

function parseWhistlerTrip(email: GoogleAppsScript.Gmail.GmailThread): Trip {
  const whistler = "Departure to Whistler";
  return parseTrip(whistler, email);
}

function parseVancouverTrip(email: GoogleAppsScript.Gmail.GmailThread): Trip {
  const vancouver = "Departure to Vancouver";
  return parseTrip(vancouver, email);
}
// Entry point of the application
function createTrips() {
  let tripHandlers = [parseWhistlerTrip, parseVancouverTrip];

  for (const email of getUnreadEpicRidesEmails()) {
    for (const handler of tripHandlers) {
      handler(email).createEvent();
    }
    email.markRead();
    email.moveToArchive();
  }
}