import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '../auth.service';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { ScheduleappointmentsComponent } from '../scheduleappointments/scheduleappointments.component';
import {MatTableDataSource} from '@angular/material';
import { DatePipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { timer } from 'rxjs';


export interface userapp {
  whom: string;
  date: string;
  time: string;
  status: string;
  appointment_id: string;
}

var ELEMENT_DATA: userapp[] = [
];

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  displayuid: string;
  firstNameDisplay: string;
  lastNameDisplay: string;
  displayemail: string;
  isDoctorDisplay:string;
  isDoctor: boolean;
  displayedColumns: string[] = ['whom', 'date', 'time', 'status', 'cancel', 'text', 'video'];
  dataSource = new MatTableDataSource(ELEMENT_DATA);
  firstandlastname = this.lastNameDisplay + " " + this.firstNameDisplay;
  surname: string;
  doctors:string[] = [];
  patients:string[] = [];
  appointment_id: string;
  currentdate = this.datePipe.transform(new Date(), "M/dd/yyyy");

  fileNameDialogRef: MatDialogRef<ScheduleappointmentsComponent>;

  constructor(
    public authService: AuthService,
    public afAuth: AngularFireAuth,
    public afs: AngularFirestore,   // Inject Firestore service
    private dialog: MatDialog,
    private datePipe: DatePipe,
    private snackbar: MatSnackBar,
  ) {
  }

  ngOnInit() {
    try {
      this.displayuid = this.afAuth.auth.currentUser.uid
      localStorage.setItem("displayuid", this.displayuid);
    } catch (error) {
      this.displayuid = localStorage.getItem("displayuid");
    }
    try {
      this.displayemail = this.afAuth.auth.currentUser.email;
      localStorage.setItem("displayemail", this.displayemail);
    } catch (error) {
      this.displayemail = localStorage.getItem("displayemail");
    }
    // Fetch user's data
    this.fetchuserdata()

    // Fetch all appointments for the user when opening or refreshing the page.
    this.fetchappointments()

  }
    fetchuserdata() {
    // Retrieve user data
    var docRef = this.afs.collection('users').doc(this.displayuid);
    docRef.get().toPromise().then((doc) => {
      if (doc.exists) {
          this.firstNameDisplay = doc.data().firstName;
          this.lastNameDisplay = doc.data().lastName;
          if (doc.data().isDoctor == true) {
            this.isDoctorDisplay = "Doctor";
            this.surname = "Dr. "
            this.isDoctor = true;
          } else {
            this.isDoctorDisplay = "Patient";
            this.isDoctor = false;
          }
      } else {
          console.log("No such document!");
      }
  }).catch(function(error) {
      console.log("Error getting document:", error);
  });
  }

  // This method will fetch all appointments
  fetchappointments () {
    // Clear the table when refreshing or going back to the page.
    ELEMENT_DATA = [];
    this.dataSource = new MatTableDataSource(ELEMENT_DATA);

    // Loop to find and update the home page with all appointments relevant to the user.
    const currentdate = this.datePipe.transform(new Date(), "M/dd/yyyy");
    this.afs.collection('appointments').get().toPromise()
    .then(querySnapshot => {
      querySnapshot.docs.forEach(doc => {
        // Import the current date and compare it to the current date.
        var date = this.datePipe.transform(doc.data().Date, "M/dd/yyyy");
        // If the appointment is outdated, then delete it.
        if (date < currentdate) {
          this.afs.collection('appointments').doc(doc.data().appointment_id).delete().then(function() {
            console.log("Found and deleted outdated documents.");
          }).catch(function(error) {
            console.error("Error removing document: ", error);
          });
          // If the document is not outdated, add it to the list for the user to see.
        } else {
          // If you are the sender
          var apptstatus = "Cancelled"
          if (doc.data().senderuid == this.displayuid) {
            if (doc.data().isActive == true)
            {
              apptstatus = "Active"
            }
            if (this.isDoctor == false)
            {
            var test = {whom: "Dr. " + doc.data().receiver, date: date, time: doc.data().Time, status: apptstatus, appointment_id: doc.data().appointment_id};
            } else {
            var test = {whom: "" + doc.data().receiver, date: date, time: doc.data().Time, status: apptstatus, appointment_id: doc.data().appointment_id};
            }
            ELEMENT_DATA.push(test);
            this.dataSource = new MatTableDataSource(ELEMENT_DATA);
            }
          // If you are the receiver
          if (doc.data().receiveruid == this.displayuid) {
            if (doc.data().isActive == true)
            {
              apptstatus = "Active"
            }
            if (this.isDoctor == true)
            {
            var test = {whom: "" + doc.data().sender, date: date, time: doc.data().Time, status: apptstatus, appointment_id: doc.data().appointment_id};
            } else {
            var test = {whom: "Dr. " + doc.data().sender, date: date, time: doc.data().Time, status: apptstatus, appointment_id: doc.data().appointment_id};
            }
            ELEMENT_DATA.push(test);
            this.dataSource = new MatTableDataSource(ELEMENT_DATA);
            } 
            }
          });
        });
    }

    refresh() {
    this.fetchappointments();
    }

  openAddFileDialog() {
    if (!(this.firstNameDisplay == null || this.lastNameDisplay == null || this.firstNameDisplay == "" || this.lastNameDisplay == "")) {
      this.fileNameDialogRef = this.dialog.open(ScheduleappointmentsComponent);
    } else {
      this.snackbar.open("Please add a first and/or last name before scheduling an appointment!", 'Dismiss', {duration: 3000});
    }
  }

  // This will be the button that goes to the current open appointment.,
  goToVideoAppointment(whom) { 
    this.snackbar.open("Going to a video appointment with " + whom + "...")._dismissAfter(2000);
  }

  goToTextAppointment(whom) {
    this.snackbar.open("Opening text chat with " + whom + "...")._dismissAfter(2000);
  }

  // This method cancels the currently selected appointment.
  async cancelAppointment(whom, date, time, status) { 
    for (var i = 0; i < ELEMENT_DATA.length; i++) {
      if (ELEMENT_DATA[i].whom == whom && ELEMENT_DATA[i].date == date && ELEMENT_DATA[i].time == time && ELEMENT_DATA[i].status == status) {
        this.afs.collection('appointments').doc(ELEMENT_DATA[i].appointment_id).update({
          isActive: false,
        }).catch(function(error) {
          console.error("Error removing document: ", error);
        });
      }
  }
}

  isMenuOpen = true;
  contentMargin = 240;

  onToolbarMenuToggle() {
    console.log('On toolbar toggled', this.isMenuOpen);
    this.isMenuOpen = !this.isMenuOpen;

    if (!this.isMenuOpen) {
      this.contentMargin = 70;
    } else {
      this.contentMargin = 240;
    }
  }
}

//<div *ngIf="authService.userData as user"> <h1>Hello: {{(user.displayName) ? user.displayName : 'User'}}