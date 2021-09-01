console.log("Content script loaded");

//version of our eazybe extension
var version = "2.4.6";
var isRunning = false;
//global variable to knwo whether we have to show the schedule list or customer followuplist
// if it is zero we show followup list
// else we shwo the scheduled list
var scheduleOn = 0;
// customer array is a temporary or say realtime array to get what are the set of customers in the current list of customer followup .
// please watch extension video guide to understand more
var customerArray = [];
// customerpendingarray is a temporary or say realtime array to get what are the set of customers in the current list of customer followup pending .
// please watch extension video guide to understand more
var customerPendingArray = [];
//it is full list of customers of the user in the followp secton
var customerListArray = [];
// it is full list of customers of the user in the pending followup section
var customerFollowupList = [];
// it is used to store the latest set of tags
// whenever we add/remove tags of any customer we call settinguptags and update it
var customerTags = [
  "Lead",
  "Paid Client",
  "Pending Payment",
  "Visitor",
  "Employee",
];

var AllContacts;
// active_chat_id is the chat id which is openend currently by the user
var active_chat_id;
// list of all scheduled messages
var customerScheduleArr = [];
// watch video
var filterTagArr = [];
var filterTagPendingArr = [];
var isExpired = false;
var isSignup = false;
var isChanged = true;
var presentDate = "";
var phoneString = "";
var prevTextinfo = "";
var followupDateTime;

//setting up script of wwebjs
// we append this script again and again
function settingUpWWEbjs(params) {
  var wapiScript = document.createElement("script");
  wapiScript.src = chrome.runtime.getURL("assets/js/wapi.js");
  wapiScript.setAttribute("id", "wapi");
  document.getElementsByTagName("head")[0].append(wapiScript);
}
var interValId17 = setInterval(() => {
  var data = newToolInsertCheck();
  if (data != null) {
    settingUpWWEbjs();
    window.clearInterval(interValId17);
  }
}, 1000);

//we first find the user mobile no by repeteadly sending post message to wapi
// once we get user mobile no we end this interval in listeningtomessages function
var interValId8 = setInterval(() => {
  window.postMessage(
    {
      cmd: "findUserId",
      direction: "from-content-script",
    },
    "*"
  );
}, 2000);

function listeningtomessages(params) {
  var count = 0;
  window.addEventListener("message", function (event) {
    if (
      event.source == window &&
      event.data &&
      event.data.direction == "from-page-script"
    ) {
      console.log("lsitend");
      if (event.data.res == "userId") {
        if (count == 0) {
          var userId = event.data.id;

          phoneString = userId;
          window.clearInterval(interValId8);

          //funtion to append popup html and css files into the dom
          newTool();
          //pane-side is the chat section of the wahtsapp
          var paneSide = document.getElementById("pane-side");
          paneSide.addEventListener("click", (event) => {
            console.log("pane side is clicked ");
            window.postMessage(
              { cmd: "getContactId", direction: "from-content-script" },
              "*"
            );
          });

          count = 1;
          console.log(phoneString);
        }
      } else if (event.data.res == "contactInfo") {
        //to set the contact name in the schedule section popup
        document.getElementsByClassName("contactDisplayName")[0].innerHTML =
          event.data.contact;
        if (document.getElementById("username")) {
          document.getElementById("username").value = event.data.contact;
        }
        console.log(event.data.contact);
      } else if (event.data.res == "contactId") {
        //this is to set the latest acitve chat id
        console.log("found popup", event.data.id);
        active_chat_id = event.data.id;
        customerInfoFinder();
      }
    }
  });
}

listeningtomessages();

//remove the tag/label of a customer
function removeTheTag(customer_no, tagText) {
  const no_customer = BigInt(customer_no);
  const tagVal = tagText.innerHTML;
  const no_user = BigInt(phoneString);
  console.log("deleting a tag");
  fetch(
    "https://eazybe.com/api/v1/whatzapp/deleteCustomerTag?" +
      new URLSearchParams({
        user_mobile_No: no_user,
        mobile: no_customer,
      }),
    {
      method: "POST",

      body: JSON.stringify({
        tag: tagVal,
      }),

      
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
    }
  )
    .then((response) => response.json())
    .then((json) => {
      console.log(json);
    });

  customerListArray.forEach((element) => {
    if (element.customer_mobile == no_customer) {
      var arr = [];
      element.tags.forEach((newEl) => {
        if (newEl.TagName != tagVal) {
          arr.push(newEl);
        }
      });
      element.tags = arr;
      console.log(element);
    }
  });
  customerArray = customerListArray;
}

//deleting the info and the customer of a user from the usertocustomer table
function deleteTheUserCustomer(customer_no, user_no) {
  var no_user = BigInt(user_no);
  var no_customer = BigInt(customer_no);
  customerListArray = customerListArray.filter((element) => {
    return element.customer_mobile != no_customer;
  });

  customerFollowupList = customerFollowupList.filter((element) => {
    return element.customer_mobile != no_customer;
  });

  getCustomerList(customerListArray);
  getFollowUpPendingList(customerFollowupList);

  document.getElementById("searchTheCustomer").style.display = "block";

  document.getElementById("searchTheCustomer2").style.display = "block";

  fetch(
    "https://eazybe.com/api/v1/whatzapp/deleteUserCustomer?" +
      new URLSearchParams({
        user_mobile_No: no_user,
        mobile: no_customer,
      })
  )
    .then((resp) => resp.json())
    .then(function (response) {
      console.log(response);
      getTheDefaultTags();
    })
    .catch(function (error) {
      console.log(error);
    });
}

//function to post the info of a customer into the user to customer table
// follouwp date label and interest level all data is posted by this function
function postTheTagsOFCustomer(no_user, no_customer, chat_id) {
  const tagText = document.getElementById("custom-tag-input").value;
  const noteText = document.getElementById("noteinfo").value;
  var followupDate = document.getElementById("followupDate").value;
  var object2 = document.getElementById("Interest-level").value;
  const nameInfo = document.getElementById("username").value;
  var srcImage = document.getElementById("demouser").src;
  var emailOfCustomer = "user@gmail.com";
  validityChecker();

  const customer_no = String(no_customer);
  var notes;
  if (noteText && followupDate) {
    notes = noteText
      ? {
          date: followupDate.substring(0, 10),
          note: noteText,
        }
      : {};
  } else {
    notes = {};
  }

  console.log("sending info");

  //checking if the user is premium or not
  // if its validity is expired then we limit its followup list to 3
  if (isExpired) {
    if (customerListArray.length >= 3) {
      var ffs = 1;
      customerListArray.forEach((element) => {
        if (element.chat_id == chat_id) {
          ffs = 0;
        }
      });
      if (ffs) {
        // document.getElementById("PremiumPopup").style.display = "block";
        console.log("premium pop up__1");
        display_price();
        // document.getElementsByClassName("scheduleOverlay")[0].style.display =
          "block";
        return;
      }
    }
  }

  fetch(
    "https://eazybe.com/api/v1/whatzapp/userCustomerPostInfo?" +
      new URLSearchParams({
        user_mobile_No: no_user,
        chat_id: chat_id,
        mobile: no_customer,
      }),
    {
      method: "POST",

      body: JSON.stringify({
        tag: tagText,
        notes: notes,
        follow_up_date: followupDate,
        interest_Level: object2,
        name: nameInfo,
        img_src: srcImage,
        email: emailOfCustomer,
      }),

      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
    }
  )
    .then((response) => response.json())

    .then((json) => {
      console.log(json);
    });

  setTimeout(() => {
    fetch(
      "https://eazybe.com/api/v1/whatzapp/customerInfoList?" +
        new URLSearchParams({
          user_mobile_No: no_user,
        })
    )
      .then((resp) => resp.json())
      .then(function (response) {
        var object = response.data;
        customerListArray = object;
        customerArray = customerListArray;

        document.getElementsByClassName("uppertablabel")[1].innerHTML = "";
        document.getElementsByClassName("uppertablabel")[1].innerHTML =
          "Followup ";
        document.getElementsByClassName("uppertablabel")[1].innerHTML +=
          "(" + object.length + ")";
        settingUpTags();
        getCustomerList(object);
        document
          .getElementById("upgrade")
          .getElementsByTagName("button")[1].style.display = "none";

        customerListArray.forEach((element) => {
          if (element.chat_id == chat_id) {
            getTheTagsOFCustomer(element);
          }
        });
      })
      .catch(function (error) {
        console.log(error);
      });
  }, 2000);

  document.getElementById("custom-tag-input").value = "";
}

//searcing in getfollowuppendinglsit applying filteres
var searchNamePendingArr = [];
var filteredTagPendingArr = [];
//this is a function speciific for searching in the customer-pending-list
function searchTheResultPendingFollowUp(filterTagObject, interest_Level) {
  fbqEventCatcher("Search");
  var filteredInterestPendingarr = [];
  if (searchNamePendingArr.length != 0) {
    if (interest_Level !== "") {
      filteredInterestPendingarr = searchNamePendingArr.filter((element) => {
        return element.interest_Level == interest_Level;
      });
    } else {
      filteredInterestPendingarr = searchNamePendingArr;
    }
  } else {
    if (interest_Level !== "") {
      filteredInterestPendingarr = customerFollowupList.filter((element) => {
        return element.interest_Level == interest_Level;
      });
    } else {
      filteredInterestPendingarr = customerFollowupList;
    }
  }

  console.log(filteredInterestPendingarr);

  filteredInterestPendingarr.forEach((element) => {
    var textArr = [];
    element.tags.forEach((element) => {
      if (element.TagName) textArr.push(element.TagName);
      else textArr.push(element);
    });
    var i = 0;

    for (i = 0; i < textArr.length; i++) {
      element.tags[i] = textArr[i];
    }
  });
  filteredTagPendingArr = filteredInterestPendingarr.filter((element) => {
    return element.tags.some((ai) => filterTagObject.includes(ai));
  });

  if (filteredTagPendingArr.length === 0 && filterTagObject.length === 0)
    filteredTagPendingArr = filteredInterestPendingarr;

  console.log(filteredTagPendingArr);
  console.log(filteredInterestPendingarr);

  getFollowUpPendingList(filteredTagPendingArr);

  var buttonCross = document.createElement("button");
  buttonCross.innerHTML = "x";
  buttonCross.classList.add("removefilter");
  buttonCross.title = "Remove Filters";
  document.getElementById("searchTheCustomer2").append(buttonCross);
  buttonCross.addEventListener("click", function (params) {
    filteredTagPendingArr = [];
    filterTagPendingArr = [];
    getFollowUpPendingList(customerFollowupList);

    for (
      var i = 0;
      i <
      document.getElementById("taglistcheckbox2").getElementsByTagName("input")
        .length;
      i++
    ) {
      if (
        document
          .getElementById("taglistcheckbox2")
          .getElementsByTagName("input")[i].checked == true
      )
        document
          .getElementById("taglistcheckbox2")
          .getElementsByTagName("input")[i].checked = false;
    }
    document.getElementById("filterTagsInput2").placeholder = "Labels";

    document.getElementById("filterLevelInput2").value = "";

    this.innerHTML = "";
    this.classList.remove("removefilter");
    this.remove();
  });
}
// search according to the name basis in the customer-pending list
function searchTheResultPendingFollowUpNameBasis(params) {
  console.log(params);

  if (filteredTagPendingArr.length === 0) {
    var arr = [];
    searchNamePendingArr = customerFollowupList.forEach((element) => {
      if (element.name.toUpperCase().includes(params.toUpperCase())) {
        arr.push(element);
      }
    });
    searchNamePendingArr = arr;
  } else {
    var arr = [];
    searchNamePendingArr = filteredTagPendingArr.forEach((element) => {
      if (element.name.toUpperCase().includes(params.toUpperCase())) {
        arr.push(element);
      }
    });
    searchNamePendingArr = arr;
  }

  getFollowUpPendingList(searchNamePendingArr);
}

var searchNameArr = [];
var filteredTagsarr = [];

//searching in getcustomerlist applying filters
function searchTheResult(filterTagObject, interest_Level) {
  var filterInterestLevelarr = [];
  console.log("SEarch initiated");
  fbqEventCatcher("Search");

  if (searchNameArr.length != 0) {
    if (interest_Level !== "") {
      filterInterestLevelarr = searchNameArr.filter((element) => {
        return element.interest_Level == interest_Level;
      });
    } else {
      filterInterestLevelarr = searchNameArr;
    }
  } else {
    if (interest_Level !== "") {
      filterInterestLevelarr = customerListArray.filter((element) => {
        return element.interest_Level == interest_Level;
      });
    } else {
      filterInterestLevelarr = customerListArray;
    }
  }

  console.log(filterInterestLevelarr);

  filterInterestLevelarr.forEach((element) => {
    var textArr = [];
    element.tags.forEach((element) => {
      if (element.TagName) textArr.push(element.TagName);
      else textArr.push(element);
    });
    var i = 0;

    for (i = 0; i < textArr.length; i++) {
      element.tags[i] = textArr[i];
    }
  });
  filteredTagsarr = filterInterestLevelarr.filter((element) => {
    return element.tags.some((ai) => filterTagObject.includes(ai));
  });
  if (filteredTagPendingArr.length === 0 && filterTagObject.length === 0)
    filteredTagsarr = filterInterestLevelarr;

  console.log(filteredTagsarr);
  console.log(filterInterestLevelarr);

  getCustomerList(filteredTagsarr);
}

// function to search by input in the search box
function searchTheResultBasisName(params) {
  console.log(params);

  if (filteredTagsarr.length == 0) {
    var arr = [];
    customerListArray.forEach((element) => {
      if (element.name.toUpperCase().includes(params.toUpperCase())) {
        arr.push(element);
      }
    });
    searchNameArr = arr;
  } else {
    var arr = [];
    searchNameArr = filteredTagsarr.forEach((element) => {
      if (element.name.toUpperCase().includes(params.toUpperCase())) {
        arr.push(element);
      }
    });

    searchNameArr = arr;
  }

  getCustomerList(searchNameArr);
}

// function to show all the pending followup customers of the user ( we insert all the objects as a customer card into the customer-pending-list)
// it is called when the user clicks on the pending followup tab
function getFollowUpPendingList(object1) {
  console.log("fetching customers with followupPending");

  document
    .getElementById("upgrade")
    .getElementsByTagName("button")[1].style.display = "block";
  var i = 0;
  document
    .getElementById("scheduled-list")
    .getElementsByClassName("tab")[2].style.display = "none";
  document.getElementById("customer-pending-list").style.marginTop = "84px";
  document.getElementById("customer-pending-list").innerHTML = "";
  document.getElementById("pendingFollowupTitle").innerHTML =
    "Pending Followup ";
  document.getElementById("pendingFollowupTitle").innerHTML +=
    "(" + object1.length + ")";
  document.getElementById("sendMessageAll").innerHTML = "";
  document.getElementById("sendMessageAll").innerHTML = "Send Message";
  document.getElementById("sendMessageAll").innerHTML +=
    "(" + object1.length + ")";
  customerArray = object1;
  document.documentElement.style.setProperty("--some-width", "50%");
  var liveArr = sortByFollowupDate(object1);
  document.documentElement.style.setProperty("--some-grid-width", "53px");

  fetch(chrome.runtime.getURL("expanded.html"))
    .then((r) => r.text())
    .then((html) => {
      // we loop through all elements of the list and insert as a customer-card into the ui
      liveArr.forEach((element) => {
        var customerObject = document.createElement("div");
        var customerImgObject = document.createElement("div");
        var imgObject = document.createElement("img");
        var customerDescObject = document.createElement("div");
        var customerNameObject = document.createElement("p");
        var customerNoObject = document.createElement("p");
        var customerStatusObject = document.createElement("div");
        var customerButtonObject = document.createElement("div");
        var customerFollowupObject = document.createElement("div");
        var monthDesc = document.createElement("div");
        var dateDesc = document.createElement("div");

        var button1 = document.createElement("button");
        var imgbutton1 = document.createElement("img");

        imgbutton1.style = "height: 23px; width: 21px;";
        var button2 = document.createElement("button");
        var imgbutton2 = document.createElement("img");

        imgbutton2.style = "height: 23px; width: 21px;";
        var expandedObject = document.createElement("div");

        customerStatusObject.classList.add("status");

        expandedObject.insertAdjacentHTML("beforeend", html);
        expandedObject.getElementsByClassName("followupDateNew")[0].src =
          chrome.runtime.getURL("calender.svg");
        var notesOn = 0;

        var followupdateexist = 0;

        customerButtonObject.style = "display: flex; ";
        customerObject.classList.add("customer-card");
        customerImgObject.classList.add("customer-card-img");

        customerDescObject.style = "margin-left: 12px;";
        imgObject.style = "height: 46px; width: 47px; margin: 2px 2px;";

        expandedObject.classList.add("expanded-content");

        customerNoObject.style =
          "margin-bottom: 0px; font-size: 12px; color: gray;";

        customerNameObject.style =
          "margin-bottom: 0px; font-size: 15px;line-height: 25px; margin-top: 4px;";
        if (element.chat_id.length > 18) customerNoObject.innerHTML = "Group";
        else {
          customerNoObject.innerHTML = element.customer_mobile;
        }
        customerNameObject.innerHTML = element.name;

        if (element.img_src) imgObject.src = element.img_src;

        imgObject.onerror = function name(params) {
          imgObject.src = chrome.runtime.getURL("demouser.png");
        };

        customerFollowupObject.classList.add("followupCalender");
        dateDesc.classList.add("dateDescFollowup");
        monthDesc.classList.add("monthDescFollowup");
        // to show followup date as a calender in the customer card
        if (element.follow_up_date) {
          dateDesc.innerHTML = element.follow_up_date.substring(8, 10);
          var months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          var monthName =
            months[parseInt(element.follow_up_date.substring(5, 7)) - 1];
          monthDesc.innerHTML = monthName;
          customerFollowupObject.style.display = "flex";
        } else {
          customerFollowupObject.style.display = "none";
        }

        //adding classes and appending into object

        customerFollowupObject.append(monthDesc, dateDesc);
        customerImgObject.append(imgObject);
        customerDescObject.append(customerNameObject, customerNoObject);
        customerObject.append(
          customerImgObject,
          customerDescObject,
          customerFollowupObject
        );

        // appending the customer card to the customer-pending-list one by one
        document.getElementById("customer-pending-list").append(customerObject);

        //adding event listeners to the customer object which is basically the customer-card
        customerObject.addEventListener("click", function () {
          this.classList.toggle("active");
          console.log("cutomer is clicked");

          var customer_no = element.customer_mobile;
          var chat_id = customer_no + "@c.us";
          openChat(chat_id);
          setTimeout(() => {
            customerInfoFinder();
          }, 2000);
        });
      });
    });
}

//function to sort the array object of customer list called in getcustomerlist() and getfollowuppending()
function sortByFollowupDate(object) {
  let objectWithfollowp = [];
  let objectWithoutfollowp = [];

  for (var i = 0; i < object.length; i++) {
    if (object[i].follow_up_date !== null) {
      objectWithfollowp.push(object[i]);
    } else {
      objectWithoutfollowp.push(object[i]);
    }
  }

  objectWithfollowp.sort(function (a, b) {
    if (a.follow_up_date != null && b.follow_up_date != null) {
      var year1 = parseInt(a.follow_up_date.substring(0, 4));
      var month1 = parseInt(a.follow_up_date.substring(5, 7));
      var day1 = parseInt(a.follow_up_date.substring(8, 10));

      var year2 = parseInt(b.follow_up_date.substring(0, 4));
      var month2 = parseInt(b.follow_up_date.substring(5, 7));
      var day2 = parseInt(b.follow_up_date.substring(8, 10));

      if (year1 < year2) return -1;
      if (year1 == year2 && month1 < month2) return -1;
      if (year1 == year2 && month1 == month2 && day1 < day2) return -1;

      // If none of the above cases satisfy, return false
      return 1;
    }
  });

  objectWithoutfollowp.forEach((element) => {
    objectWithfollowp.push(element);
  });

  return objectWithfollowp;
}

// function to sorrt the array of scheduled objects mainly the arrays passed in the displayscheduled()
function sortByScheduledDate(objectWithfollowp) {
  objectWithfollowp.sort(function (a, b) {
    if (a.time != null && b.time != null) {
      var year1 = parseInt(a.time.substring(0, 4));
      var month1 = parseInt(a.time.substring(5, 7));
      var day1 = parseInt(a.time.substring(8, 10));

      var year2 = parseInt(b.time.substring(0, 4));
      var month2 = parseInt(b.time.substring(5, 7));
      var day2 = parseInt(b.time.substring(8, 10));

      if (year1 < year2) return -1;
      if (year1 == year2 && month1 < month2) return -1;
      if (year1 == year2 && month1 == month2 && day1 < day2) return -1;

      // If none of the above cases satisfy, return false
      return 1;
    }
  });

  // console.log("final", objectWithfollowp);
  return objectWithfollowp;
}

//function to show all the messages scheduled and also the sent ones plus the failed ones
// we get the object array which is basically the array which stores all the users which have/had message scheduled
// when we call this function we pass a status which defines
//which category of schedule message we have to show either its upcoming or sent or failed
function displayScheduledList(object, status) {
  //this section is to reform the innerhtmls of the tab labels and setting display to block of the scheduled-list-block
  document
    .getElementById("scheduled-list")
    .getElementsByClassName("tab")[2].style.display = "block";
  document.getElementById("customer-list").innerHTML = "";
  document.getElementById("customer-pending-list").innerHTML = "";
  document.getElementById("allFollowup").innerHTML = "Scheduled ";

  document.getElementById("pendingFollowupTitle").innerHTML = "Sent ";
  document.getElementById("sendMessageAll").innerHTML = "";
  document.getElementById("sendMessageAll").innerHTML = "Send Message";
  document.getElementById("sendMessageAll").innerHTML +=
    "(" + object.length + ")";

  var newSorted = sortByScheduledDate(object);
  console.log(newSorted, status);
  document
    .getElementById("upgrade")
    .getElementsByTagName("button")[1].style.display = "block";
  document.getElementById("customer-list").style.marginTop = "0px";
  document.getElementById("customer-pending-list").style.marginTop = "0px";
  document.documentElement.style.setProperty("--some-width", "33%");
  document.documentElement.style.setProperty("--some-grid-width", "100px");

  if (status == 0) {
    var count = 0;
    customerArray = [];

    newSorted.forEach((element) => {
      if (element.status == 0) {
        customerArray.push(element);
        count++;
        var customerObject = document.createElement("div");
        var customerImgObject = document.createElement("div");
        var imgObject = document.createElement("img");
        var customerDescObject = document.createElement("div");
        var customerNameObject = document.createElement("p");
        var customerNoObject = document.createElement("p");
        var customerStatusObject = document.createElement("div");
        var customerButtonObject = document.createElement("div");
        var customerFollowupObject = document.createElement("div");
        var monthDesc = document.createElement("div");
        var dateDesc = document.createElement("div");
        //date
        var timeInfo = document.createElement("div");
        var timedesc = document.createElement("p");
        timedesc.style.margin = "0px";
        var timeSvg = document.createElement("div");
        timeInfo.style.display = "flex";

        var button1 = document.createElement("button");
        var imgbutton1 = document.createElement("img");

        imgbutton1.style = "height: 23px; width: 21px;";
        var button2 = document.createElement("button");
        var imgbutton2 = document.createElement("img");

        imgbutton2.style = "height: 23px; width: 21px;";
        var expandedObject = document.createElement("div");

        customerStatusObject.classList.add("status");

        customerButtonObject.style = "display: flex; ";
        customerObject.classList.add("customer-card");
        customerImgObject.classList.add("customer-card-img");

        customerDescObject.style = "margin-left: 12px;";
        imgObject.style =
          "height: 46px; width: 47px; margin: 4px ;margin-left:6px;";

        customerNoObject.style =
          "margin-bottom: 0px; font-size: 12px; color: gray;";

        customerNameObject.style =
          "margin-bottom: 0px; font-size: 15px;line-height: 25px; margin-top: 4px;";
        if (element.chat_id.length > 18) customerNoObject.innerHTML = "Group";
        else {
          customerNoObject.innerHTML = element.customer_mobile;
        }
        customerNameObject.innerHTML = element.name;

        imgObject.src = element.img_src;

        imgObject.onerror = function name(params) {
          imgObject.src = chrome.runtime.getURL("demouser.png");
        };

        if (element.time) {
          dateDesc.innerHTML = element.time.substring(8, 10);
          var months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          var monthName = months[parseInt(element.time.substring(5, 7)) - 1];
          monthDesc.innerHTML = monthName;

          timedesc.innerHTML = element.time.substring(0, 10);
          timeSvg.innerHTML =
            "<svg style='    color: black;height: 1em; width: 1em;' aria-hidden='true' focusable='false' data-prefix='fas' data-icon='clock' class='svg-inline--fa fa-clock fa-w-16' role='img' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path fill='currentColor' d='M256,8C119,8,8,119,8,256S119,504,256,504,504,393,504,256,393,8,256,8Zm92.49,313h0l-20,25a16,16,0,0,1-22.49,2.5h0l-67-49.72a40,40,0,0,1-15-31.23V112a16,16,0,0,1,16-16h32a16,16,0,0,1,16,16V256l58,42.5A16,16,0,0,1,348.49,321Z'></path></svg>";
        }

        //adding classes and appending into object
        customerFollowupObject.classList.add("scheduledCalender");
        dateDesc.classList.add("dateDescFollowup");
        monthDesc.classList.add("monthDescFollowup");
        customerFollowupObject.append(timedesc, timeSvg);
        customerImgObject.append(imgObject);
        customerDescObject.append(customerNameObject, customerNoObject);

        if (element.time) {
          customerScheduleArr.forEach((element1) => {
            if (element1.customer_mobile == element.customer_mobile) {
              if (element1.status == "0") {
                customerStatusObject.style.backgroundColor = "orange";
                customerStatusObject.style.boxShadow = "0px 0px 2px #f79011";
              } else if (element1.status == "1") {
                customerStatusObject.style.backgroundColor = "#57d423";
                customerStatusObject.style.boxShadow = "0px 0px 2px #31e3cb";
              } else {
                customerStatusObject.style.backgroundColor = "#e96b6b";
                customerStatusObject.style.boxShadow = "0px 0px 2px #f23b3b";
              }
            }
          });

          customerObject.append(
            customerImgObject,
            customerDescObject,
            customerFollowupObject,
            customerStatusObject
          );
        }

        document.getElementById("customer-list").append(customerObject);
        customerObject.addEventListener("click", function (params) {
          let phonenum = customerNoObject.innerHTML;
          validityChecker();

          const chat_id = phonenum + "@c.us";
          console.log(chat_id);
          openChat(chat_id);

          setTimeout(() => {
            customerInfoFinder();
          }, 1000);
        });
      }
    });

    document.getElementById("allFollowup").innerHTML += "(" + count + ")";
    document.getElementById("sendMessageAll").innerHTML = "";
    document.getElementById("sendMessageAll").innerHTML = "Send Message";
    document.getElementById("sendMessageAll").innerHTML += "(" + count + ")";
  } else if (status == 1) {
    var count = 0;
    document.getElementById("customer-pending-list").innerHTML = "";
    customerArray = [];
    newSorted.forEach((element) => {
      if (element.status == 1) {
        customerArray.push(element);
        count++;
        var customerObject = document.createElement("div");
        var customerImgObject = document.createElement("div");
        var imgObject = document.createElement("img");
        var customerDescObject = document.createElement("div");
        var customerNameObject = document.createElement("p");
        var customerNoObject = document.createElement("p");
        var customerStatusObject = document.createElement("div");
        var customerButtonObject = document.createElement("div");
        var customerFollowupObject = document.createElement("div");
        var monthDesc = document.createElement("div");
        var dateDesc = document.createElement("div");
        //date
        var timeInfo = document.createElement("div");
        var timedesc = document.createElement("p");
        var timeSvg = document.createElement("div");
        timeInfo.style.display = "flex";
        timedesc.style.margin = "0px";
        var button1 = document.createElement("button");
        var imgbutton1 = document.createElement("img");

        imgbutton1.style = "height: 23px; width: 21px;";
        var button2 = document.createElement("button");
        var imgbutton2 = document.createElement("img");

        imgbutton2.style = "height: 23px; width: 21px;";
        var expandedObject = document.createElement("div");

        customerStatusObject.classList.add("status");

        customerButtonObject.style = "display: flex; ";
        customerObject.classList.add("customer-card");
        customerImgObject.classList.add("customer-card-img");

        customerDescObject.style = "margin-left: 12px;";
        imgObject.style =
          "height: 46px; width: 47px; margin: 4px ;margin-left:6px;";

        customerNoObject.style =
          "margin-bottom: 0px; font-size: 12px; color: gray;";

        customerNameObject.style =
          "margin-bottom: 0px; font-size: 15px;line-height: 25px; margin-top: 4px;";
        if (element.chat_id.length > 18) customerNoObject.innerHTML = "Group";
        else {
          customerNoObject.innerHTML = element.customer_mobile;
        }
        customerNameObject.innerHTML = element.name;
        imgObject.src = element.img_src;

        imgObject.onerror = function name(params) {
          imgObject.src = chrome.runtime.getURL("demouser.png");
        };

        if (element.time) {
          dateDesc.innerHTML = element.time.substring(8, 10);
          var months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          var monthName = months[parseInt(element.time.substring(5, 7)) - 1];
          monthDesc.innerHTML = monthName;
          timedesc.innerHTML = element.time.substring(0, 10);
          timeSvg.innerHTML =
            "<svg style='color: black;height: 1em; width: 1em;' aria-hidden='true' focusable='false' data-prefix='fas' data-icon='clock' class='svg-inline--fa fa-clock fa-w-16' role='img' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path fill='currentColor' d='M256,8C119,8,8,119,8,256S119,504,256,504,504,393,504,256,393,8,256,8Zm92.49,313h0l-20,25a16,16,0,0,1-22.49,2.5h0l-67-49.72a40,40,0,0,1-15-31.23V112a16,16,0,0,1,16-16h32a16,16,0,0,1,16,16V256l58,42.5A16,16,0,0,1,348.49,321Z'></path></svg>";
        }

        //adding classes and appending into object
        customerFollowupObject.classList.add("scheduledCalender");
        dateDesc.classList.add("dateDescFollowup");
        monthDesc.classList.add("monthDescFollowup");
        customerFollowupObject.append(timedesc, timeSvg);
        customerImgObject.append(imgObject);
        customerDescObject.append(customerNameObject, customerNoObject);

        if (element.time) {
          customerScheduleArr.forEach((element1) => {
            if (element1.customer_mobile == element.customer_mobile) {
              if (element1.status == "0") {
                customerStatusObject.style.backgroundColor = "orange";
                customerStatusObject.style.boxShadow = "0px 0px 2px #f79011";
              } else if (element1.status == "1") {
                customerStatusObject.style.backgroundColor = "#57d423";
                customerStatusObject.style.boxShadow = "0px 0px 2px #31e3cb";
              } else {
                customerStatusObject.style.backgroundColor = "#e96b6b";
                customerStatusObject.style.boxShadow = "0px 0px 2px #f23b3b";
              }
            }
          });

          customerObject.append(
            customerImgObject,
            customerDescObject,
            customerFollowupObject,
            customerStatusObject
          );
        }

        document.getElementById("customer-pending-list").append(customerObject);
        customerObject.addEventListener("click", function (params) {
          let phonenum = customerNoObject.innerHTML;

          const chat_id = phonenum + "@c.us";
          openChat(chat_id);
          setTimeout(() => {
            customerInfoFinder();
          }, 1000);
        });
      }
    });

    document.getElementById("pendingFollowupTitle").innerHTML = "Sent ";
    document.getElementById("pendingFollowupTitle").innerHTML +=
      "(" + count + ")";
    document.getElementById("sendMessageAll").innerHTML = "";
    document.getElementById("sendMessageAll").innerHTML = "Send Message";
    document.getElementById("sendMessageAll").innerHTML += "(" + count + ")";
  } else {
    var count = 0;
    document.getElementById("failedMsgList").innerHTML = "";
    customerArray = [];
    newSorted.forEach((element) => {
      if (element.status == -1) {
        customerArray.push(element);
        count++;
        var customerObject = document.createElement("div");
        var customerImgObject = document.createElement("div");
        var imgObject = document.createElement("img");
        var customerDescObject = document.createElement("div");
        var customerNameObject = document.createElement("p");
        var customerNoObject = document.createElement("p");
        var customerStatusObject = document.createElement("div");
        var customerButtonObject = document.createElement("div");
        var customerFollowupObject = document.createElement("div");
        var monthDesc = document.createElement("div");
        var dateDesc = document.createElement("div");
        //date
        var timeInfo = document.createElement("div");
        var timedesc = document.createElement("p");
        var timeSvg = document.createElement("div");
        timeInfo.style.display = "flex";
        timedesc.style.margin = "0px";

        var button1 = document.createElement("button");
        var imgbutton1 = document.createElement("img");

        imgbutton1.style = "height: 23px; width: 21px;";
        var button2 = document.createElement("button");
        var imgbutton2 = document.createElement("img");

        imgbutton2.style = "height: 23px; width: 21px;";
        var expandedObject = document.createElement("div");

        customerStatusObject.classList.add("status");

        customerButtonObject.style = "display: flex; ";
        customerObject.classList.add("customer-card");
        customerImgObject.classList.add("customer-card-img");

        customerDescObject.style = "margin-left: 12px;";
        imgObject.style =
          "height: 46px; width: 47px; margin: 4px ;margin-left:6px;";

        customerNoObject.style =
          "margin-bottom: 0px; font-size: 12px; color: gray;";

        customerNameObject.style =
          "margin-bottom: 0px; font-size: 15px;line-height: 25px; margin-top: 4px;";
        if (element.chat_id.length > 18) customerNoObject.innerHTML = "Group";
        else {
          customerNoObject.innerHTML = element.customer_mobile;
        }
        customerNameObject.innerHTML = element.name;
        imgObject.src = element.img_src;

        imgObject.onerror = function name(params) {
          imgObject.src = chrome.runtime.getURL("demouser.png");
        };

        if (element.time) {
          dateDesc.innerHTML = element.time.substring(8, 10);
          var months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          var monthName = months[parseInt(element.time.substring(5, 7)) - 1];
          monthDesc.innerHTML = monthName;
          timedesc.innerHTML = element.time.substring(0, 10);
          timeSvg.innerHTML =
            "<svg style='    color: black;height: 1em; width: 1em;' aria-hidden='true' focusable='false' data-prefix='fas' data-icon='clock' class='svg-inline--fa fa-clock fa-w-16' role='img' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path fill='currentColor' d='M256,8C119,8,8,119,8,256S119,504,256,504,504,393,504,256,393,8,256,8Zm92.49,313h0l-20,25a16,16,0,0,1-22.49,2.5h0l-67-49.72a40,40,0,0,1-15-31.23V112a16,16,0,0,1,16-16h32a16,16,0,0,1,16,16V256l58,42.5A16,16,0,0,1,348.49,321Z'></path></svg>";
        }

        //adding classes and appending into object
        customerFollowupObject.classList.add("scheduledCalender");
        dateDesc.classList.add("dateDescFollowup");
        monthDesc.classList.add("monthDescFollowup");
        customerFollowupObject.append(timedesc, timeSvg);
        customerImgObject.append(imgObject);
        customerDescObject.append(customerNameObject, customerNoObject);

        if (element.time) {
          customerScheduleArr.forEach((element1) => {
            if (element1.customer_mobile == element.customer_mobile) {
              if (element1.status == "0") {
                customerStatusObject.style.backgroundColor = "orange";
                customerStatusObject.style.boxShadow = "0px 0px 2px #f79011";
              } else if (element1.status == "1") {
                customerStatusObject.style.backgroundColor = "#57d423";
                customerStatusObject.style.boxShadow = "0px 0px 2px #31e3cb";
              } else {
                customerStatusObject.style.backgroundColor = "#e96b6b";
                customerStatusObject.style.boxShadow = "0px 0px 2px #f23b3b";
              }
            }
          });

          customerObject.append(
            customerImgObject,
            customerDescObject,
            customerFollowupObject,
            customerStatusObject
          );
        }

        document.getElementById("failedMsgList").append(customerObject);

        customerObject.addEventListener("click", function (params) {
          let phonenum = customerNoObject.innerHTML;

          const chat_id = phonenum + "@c.us";
          openChat(chat_id);
          setTimeout(() => {
            customerInfoFinder();
          }, 1000);
        });
      }
    });

    document.getElementById("failedMsg").innerHTML = "Failed ";
    document.getElementById("failedMsg").innerHTML += "(" + count + ")";
    document.getElementById("sendMessageAll").innerHTML = "";
    document.getElementById("sendMessageAll").innerHTML = "Send Message";
    document.getElementById("sendMessageAll").innerHTML += "(" + count + ")";
  }
}

// my work starts here

// function to show all the followup customers of the user into the ui
//  ( we insert all the objects as a customer card into the customer-list)
// it is called when the user clicks on the "all" (tab)

function getCustomerList(object) {
  console.log("Fetching all Customers..");

  //this is to show the cross button when we show the list
  document
    .getElementById("upgrade")
    .getElementsByTagName("button")[1].style.display = "block";

  var i = 0;
  // this is all done for updating send messages count and the inner html of labels of the tab
  document
    .getElementById("scheduled-list")
    .getElementsByClassName("tab")[2].style.display = "none";
  document.getElementById("customer-list").innerHTML = "";
  document.getElementById("pendingFollowupTitle").innerHTML =
    "Pending Followup";
  document.getElementById("allFollowup").innerHTML = "All ";
  document.getElementById("allFollowup").innerHTML += "(" + object.length + ")";

  document.getElementById("sendMessageAll").innerHTML = "";
  document.getElementById("sendMessageAll").innerHTML = "Send Message";
  document.getElementById("sendMessageAll").innerHTML +=
    "(" + object.length + ")";
  //we always update the customer array to the objects currently present in the section
  customerArray = object;
  //this is to set the width of the tabs (all and pending followup)
  document.documentElement.style.setProperty("--some-width", "50%");
  document.getElementById("customer-list").style.marginTop = "84px";
  document.documentElement.style.setProperty("--some-grid-width", "53px");

  // we store all the  objects into a livearr which is sorted according to the followupdate
  var liveArr = sortByFollowupDate(object);
  console.log("array of all usomer", liveArr);

  // we loop through all objects of the customerlistarray we see
  // we make a customer card for each object through creating elements
  // and finally appending into the customer-list

  liveArr.forEach((element) => {
    var customerObject = document.createElement("div");
    var customerImgObject = document.createElement("div");
    var imgObject = document.createElement("img");
    var customerDescObject = document.createElement("div");
    var customerNameObject = document.createElement("p");
    var customerNoObject = document.createElement("p");
    var customerStatusObject = document.createElement("div");
    var customerButtonObject = document.createElement("div");
    var customerFollowupObject = document.createElement("div");
    var monthDesc = document.createElement("div");
    var dateDesc = document.createElement("div");

    var button1 = document.createElement("button");
    var imgbutton1 = document.createElement("img");
    //  this is cretaed my me
    var delete_button__ = document.createElement("img");

    delete_button__.src = chrome.runtime.getURL("assets/icons/bin_white.png");
    // imgObject.src = chrome.runtime.getURL("demouser.png");
    delete_button__.style = "height: 30px; width:30px; margin-top:12px";


    imgbutton1.style = "height: 23px; width: 21px;";

    var button2 = document.createElement("button");
    var imgbutton2 = document.createElement("img");

    imgbutton2.style = "height: 23px; width: 21px;";

    customerStatusObject.classList.add("status");

    var followupdateexist = 0;

    customerButtonObject.style = "display: flex; ";
    customerObject.classList.add("customer-card");
    customerImgObject.classList.add("customer-card-img");

    customerDescObject.style = "";
    imgObject.style = "height: 46px; width: 47px; margin: 2px 2px;";

    customerNoObject.style =
      "margin-bottom: 0px; font-size: 12px; color: gray;";

    customerNameObject.style =
      "margin-bottom: 0px; font-size: 15px;line-height: 25px; margin-top: 4px;";

    if (element.chat_id.length > 18) customerNoObject.innerHTML = "Group";
    else {
      customerNoObject.innerHTML = element.customer_mobile;
    }
    customerNameObject.innerHTML = element.name;

    if (element.img_src) imgObject.src = element.img_src;

    imgObject.onerror = function name(params) {
      imgObject.src = chrome.runtime.getURL("demouser.png");
    };

    customerFollowupObject.classList.add("followupCalender");
    dateDesc.classList.add("dateDescFollowup");
    monthDesc.classList.add("monthDescFollowup");
    customerFollowupObject.append(monthDesc, dateDesc);
    // we configure the followup date and pick date and month
    // so that we can show it as a calender
    if (element.follow_up_date) {
      dateDesc.innerHTML = element.follow_up_date.substring(8, 10);
      var months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      var monthName =
        months[parseInt(element.follow_up_date.substring(5, 7)) - 1];
      monthDesc.innerHTML = monthName;
      customerFollowupObject.style.display = "flex";
    } else {
      customerFollowupObject.style.display = "none";
    }

    //adding classes and appending into object

    customerImgObject.append(imgObject);
    customerDescObject.append(customerNameObject, customerNoObject);
    customerObject.append(
      customerImgObject,
      customerDescObject,
      customerFollowupObject,
      delete_button__
    );
    //this is where we append the customer-card
    document.getElementById("customer-list").append(customerObject);

    var customer_mobile = element.customer_mobile;
    //adding event listener to the customer card to opne the chat when a user clicks on it
    delete_button__.addEventListener("mouseenter", function () {
      delete_button__.src = chrome.runtime.getURL("assets/icons/bin_red.png");

     
    });

    delete_button__.addEventListener("mouseleave", function () {
      delete_button__.src = chrome.runtime.getURL("assets/icons/bin_white.png");
      // console.log("on mouse leave is working");
    });
    delete_button__.addEventListener("click", function () {
      console.log("delete button is clicked");
      var customer_no = element.customer_mobile;
      var index = 0;
      liveArr.map((element, ind) => {
        // console.log(element.customer_mobile, ind);
        if (element.customer_mobile == customer_no) {
          index = ind;
          chat_id=element.chat_id
          // console.log("element", element.chat_id);
          // console.log("customerobject", customerObject);
          customerObject.style.display = "none";
          console.log(phoneString,customer_mobile);
          // console.log(chat_id,"chat_id");
          fetch(`https://eazybe.com/api/v1/whatzapp/deleteFollowUp?user_mobile_No=${phoneString}&chat_id=${chat_id}`,
          {method: "DELETE"});
        }
      });

      liveArr.splice(index, 1);
      customerArray.splice(index, 1);
      // console.log(liveArr);
      console.log(customerArray, "cutomer");
    });

    customerDescObject.addEventListener("click", function () {
      
      var customer_no = element.user_mobile;
      var chat_id = customer_no + "@c.us";
      openChat(chat_id);
      setTimeout(() => {
        customerInfoFinder();
      }, 2000);
    });

    customerImgObject.addEventListener("click", function () {
      console.log(element);
      var customer_no = element.user_mobile;
      var chat_id = customer_no + "@c.us";
      // console.log(chat_id);
      
      openChat(chat_id);
      setTimeout(() => {
        customerInfoFinder();
      }, 2000);
    });
  });
}

//setting the default layout of the infosection of the chat
function getTheDefaultTags(customer_no) {
  document.getElementById("all-custom-tags").innerHTML = "";
  document.getElementById("Interest-level").value = "";
  document.getElementById("deleteCrmData").style.display = "none";
  document.getElementById("followupDateNew").src =
    chrome.runtime.getURL("calender.svg");

  document.getElementById("notesInfo").innerHTML = "";
  document.getElementById("notesInfo").style.display = "none";

  document.getElementById("followupDateNew").style.display = "block";

  // document.getElementById("form-info-crm-down").style.display = "block";
  // document.getElementById("noteInfo").innerHTML = "";

  document.getElementById("tagInterestSection").style.display = "flex";
  document.getElementById("editTags").style.display = "none";
  document.getElementById("editTags").src =
    chrome.runtime.getURL("edit-solid.svg");
  document.getElementById("followupDate").value = "";
  document.getElementById("noteinfo").value = "";
  document.getElementById("notesInfo").value = "";
  if (document.getElementById("followupDateBox"))
    document.getElementById("followupDateBox").style.display = "none";
}
// console.log(document.getElementsByClassName("_23P3O")[0].insertBefore(document.getElementById("editTags"),document.getElementsByClassName("_23P3O")[0].childNodes[2]));

// setting the infosection of the chat by filling the details
function getTheTagsOFCustomer(customer) {
  console.log("getTheTagsOFCustomer is clicked ");
  var tagexist = 0;
  var interestexist = 0;
  var followupdateexist = 0;
  document.getElementById("deleteCrmData").style.display = "block";
  document.getElementById("noteinfo").value = "";
  document.getElementById("followupDate").value = "";
  document.getElementById("all-custom-tags").innerHTML = "";
  document.getElementById("notesInfo").innerHTML = "";
  document.getElementById("followupDateNew").src =
    chrome.runtime.getURL("calender.svg");
  console.log(customer.tags,"vibhu ");
  console.log(document.getElementById("editTags"));
  console.log("fetching the tags of customer");

  document.getElementsByClassName("_23P3O")[0].insertBefore(document.getElementById("editTags"),document.getElementsByClassName("_23P3O")[0].childNodes[2]);
  document.getElementById("editTags").style.marginRight="30px";

  element=customer;
  // console.log(element.TagName,"tags of customer");
  customer.tags.forEach((element) => {
    
    var span1 = document.createElement("span");
    var p1 = document.createElement("p");
    var button1 = document.createElement("button");
    button1.type = "button";
    button1.classList.add("x-small-button");
    button1.innerHTML = "x";
    button1.id="x-small-button";
    span1.style = "display: flex;";
    p1.classList.add("new-custom-tag");

    if (element.TagName != undefined) p1.innerHTML = element.TagName;
    else p1.innerHTML = element;
    console.log(span1,p1,button1);
    var new_div=document.createElement("div");
    new_div.style.marginRight="45px";
     new_div.style.display="flex";
     
     
    

    if (p1.innerHTML.length > 0) {
      document.getElementById("all-custom-tags").appendChild(span1);

      button1.value=p1.innerHTML;
      document.getElementById("all-custom-tags").append(p1, button1);
      tagexist = 1;
    
    }
    console.log(document.getElementsByClassName("_23P3O")[0].insertBefore(document.getElementById("all-custom-tags"),document.getElementsByClassName("_23P3O")[0].childNodes[2]));
    

  });


  
  
  if (customer.interest_Level != "") {
    document.getElementById("Interest-level").value = customer.interest_Level;
    var span1 = document.createElement("span");
    var p1 = document.createElement("p");

    span1.style = "display: flex;";
    p1.classList.add("new-custom-tag");
    p1.innerHTML = customer.interest_Level;
    document.getElementById("all-custom-tags").appendChild(span1);

    document.getElementById("all-custom-tags").append(p1);
    interestexist = 1;
  }

  if (tagexist || interestexist) {
    document.getElementById("editTags").style.display = "block";
    document.getElementById("editTags").src =
      chrome.runtime.getURL("edit-solid.svg");
    document.getElementById("tagInterestSection").style.display = "none";
  } else {
    document.getElementById("tagInterestSection").style.display = "flex";
    document.getElementById("editTags").style.display = "none";
  }

  if (customer.follow_up_date) {
    document.getElementById("followupDateBox").style.display = "flex";

    document.getElementById("followupDateNew").style.display = "none";
    followupdateexist = 1;
    document.getElementById("followupDateBox").style.display = "flex";
    document.getElementById("dateTitle").innerHTML =
      customer.follow_up_date.substring(8, 10);
    var months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    var monthName =
      months[parseInt(customer.follow_up_date.substring(5, 7)) - 1];
    document.getElementById("monthTitle").innerHTML = monthName;

    document.getElementById("noteSubmit").firstChild.style.display = "none";

    document.getElementById("noteSubmit").firstChild.nextSibling.style.display =
      "block";
  } else {
    if (document.getElementById("followupDateBox"))
      document.getElementById("followupDateBox").style.display = "none";
  }

  document
    .getElementById("all-custom-tags")
    .querySelectorAll(".x-small-button")
    .forEach((element) => {
      element.addEventListener("click", function () {
        removeTheTag(customer.customer_mobile, this.previousSibling);
        this.previousSibling.previousSibling.remove();
        this.previousSibling.remove();
        this.remove();
      });
    });

    
  var notesOn = 0;
  var count = 0;
  console.log(customer.notes);
  // customer.notes.forEach((element) => {
  //   if (element.date && element.note) {
  //     console.log(element.date, element.note);
  //     count++;
  //     notesOn = 1;
  //     console.log("note");
  //     var full = element.date;
  //     var date = "";
  //     var month = "";

  //     var j = 0;
  //     for (var i = 0; i < full.length; i++) {
  //       if (full[i] == "-") {
  //         j++;
  //       } else {
  //         if (j == 2) date += full[i];
  //         else if (j == 1) month += full[i];
  //       }
  //     }

  //     var months = [
  //       "Jan",
  //       "Feb",
  //       "Mar",
  //       "Apr",
  //       "May",
  //       "Jun",
  //       "Jul",
  //       "Aug",
  //       "Sep",
  //       "Oct",
  //       "Nov",
  //       "Dec",
  //     ];

  //     var monthName = months[parseInt(month) - 1];
  //     var lineInfo = document.createElement("p");
  //     lineInfo.style.marginBottom = "0.2rem";
  //     lineInfo.innerHTML = date + "-" + monthName + ":  " + element.note;

  //     document.getElementById("notesInfo").append(lineInfo);
  //   }
  // });

  if (notesOn == 0) {
    document.getElementById("noteinfo").style.borderBottom =
      "2px solid #cccccc";
    document.getElementById("notesInfo").style.display = "none";
  } else {
    document.getElementById("noteinfo").style.borderBottom = "0px";
    document.getElementById("notesInfo").style.display = "block";
  }
}



// document.getElementsByClassName("_23P3O").addEventListener("click",function(){
//   console.log("tag is clicked by vibhu ");
// })

//attaching event listeners to edit the infosection for every chat
// event listerner for the label input and the interest level input
function crmFormFunction() {
  var object1 = document.getElementById("custom-tag-input");

  if (typeof object1 != undefined && object1 != null) {
    const no_user = BigInt(phoneString);

    document
      .getElementById("followupDateNew")
      .addEventListener("click", function (params) {
        console.log("clicked");
        if (document.getElementById("infoTabChat").style.display == "none") {
          document.getElementById("infoTabChat").style.display = "block";
        } else {
          document.getElementById("infoTabChat").style.display = "none";
        }
      });

    document
      .getElementById("deleteCrmData")
      .addEventListener("click", function (params) {
        var chat_id = active_chat_id;

        var customer_no = chat_id.substring(0, chat_id.length - 5);
        if (customer_no.length > 12) {
          customer_no = customer_no.substring(0, 10);
        }

        deleteTheUserCustomer(customer_no, phoneString);
      });
      document.getElementById("tagInterestSection").style.marginRight="40px";
      document.getElementsByClassName("_23P3O")[0].insertBefore(document.getElementById("tagInterestSection"),document.getElementsByClassName("_23P3O")[0].childNodes[2]);

      
      document.getElementById("tagInterestSection").style.marginRight="36px";
      var info_chat_visibility=false;
    document
      .getElementById("editTags")
      .addEventListener("click", function (params) {
        console.log(document.getElementsByClassName("_23P3O")[0].insertBefore(document.getElementById("editTags"),document.getElementsByClassName("_23P3O")[0].childNodes[5]));
        document.getElementById("editTags").style.marginRight="34px";
        document.getElementById("editTags").style.fontSize="40px"

        console.log("edit_tag is clicked");
        info_chat_visibility=!info_chat_visibility;
        console.log(document.getElementById("infoTabChat"));
        if(info_chat_visibility)
        {
          // document.getElementById("infoTabChat").style.display="block";
          console.log("infotab chat is vissible");
        }
        else
        {
          // document.getElementById("infoTabChat").style.display="none";
          console.log("infotab chat is not vissible");
        }
        // document.getElementById("tagInterestSection").style.display == "block";
        // infoButton=document.getElementsByClassName("us699");
        // console.log(infoButton,"ius699");
        // if (!document.getElementById("activeSvg")) {
        //   document.getElementById("infoTabChat").style.display = "block";
        //   // infoButton.getElementsByClassName("us699")[0].innerHTML =
        //     // "<svg class='MuiSvgIcon-root ' id='activeSvg' focusable='false' viewBox='0 0 24 24' aria-hidden='true' style='color: white;fill:white;'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 12l-4-4h8l-4 4z'></path></svg><span class='MuiBadge-root'><span style='padding: 8px;color:white;'>Info</span><span class='MuiBadge-badge MuiBadge-anchorOriginTopRightRectangle MuiBadge-colorPrimary MuiBadge-invisible'></span></span>";
        // } else {
          
        //   document.getElementById("infoTabChat").style.display = "none";
        //   // infoButton.innerHTML =
        //     // "<div role='button' id='infoSection' style='    background: #0074fc; border-radius: 12px; color: white;' class='_VDboCREG'><div><div class='us699'><svg style='fill:white' class='MuiSvgIcon-root' focusable='false' viewBox='0 0 24 24' aria-hidden='true'><path d='M7 14l5-5 5 5H7z'></path></svg><span class='MuiBadge-root'><span style='padding: 8px;color:white;'>Info</span><span class='MuiBadge-badge MuiBadge-anchorOriginTopRightRectangle MuiBadge-colorPrimary MuiBadge-invisible'></span></span></div></div></div>";
        // }




        if (
          document.getElementById("tagInterestSection").style.display == "none"
        )
          document.getElementById("tagInterestSection").style.display = "flex";
        else if (
          document.getElementById("tagInterestSection").style.display == "flex"
        )
          document.getElementById("tagInterestSection").style.display = "none";
      });

    // document
    //   .getElementById("followupCalender")
    //   .addEventListener("change", function (params) {
    //     var chat_id = String(document.getElementById("phonenumber").innerHTML);

    //     var customer_no = chat_id.substring(0, chat_id.length - 5);
    //     if (customer_no.length > 12) {
    //       customer_no = customer_no.substring(0, 10);
    //     }

    //     var no_customer = BigInt(customer_no);

    //     const no_user = BigInt(phoneString);
    //     document.getElementById("followupDate").value = this.value;

    //     postTheTagsOFCustomer(no_user, no_customer, chat_id);
    //   });

    document
      .getElementById("followupDateBox")
      .addEventListener("click", function (params) {
        if (document.getElementById("infoTabChat").style.display == "none") {
          document.getElementById("infoTabChat").style.display = "block";
        } else {
          document.getElementById("infoTabChat").style.display = "none";
        }
      });

    document
      .getElementById("custom-tag-input")
      .addEventListener("change", function (params) {
        var chat_id = active_chat_id;

        var customer_no = chat_id.substring(0, chat_id.length - 5);
        if (customer_no.length > 12) {
          customer_no = customer_no.substring(0, 10);
        }

        console.log(customer_no);
        var no_customer = BigInt(customer_no);

        const no_user = BigInt(phoneString);
        postTheTagsOFCustomer(no_user, no_customer, chat_id);
      });

    document
      .getElementById("Interest-level")
      .addEventListener("change", function (params) {
        var chat_id = active_chat_id;

        var customer_no = chat_id.substring(0, chat_id.length - 5);
        if (customer_no.length > 12) {
          customer_no = customer_no.substring(0, 10);
        }

        console.log(customer_no);
        var no_customer = BigInt(customer_no);

        const no_user = BigInt(phoneString);

        postTheTagsOFCustomer(no_user, no_customer, chat_id);
      });

    document
      .getElementById("noteSubmit")
      .addEventListener("click", function (params) {
        if (this.firstChild.style.display == "block") {
          if (
            document.getElementById("noteInfo1").value &&
            document.getElementById("followupDate").value
          ) {
            var chat_id = String(
              document.getElementById("phonenumber").innerHTML
            );

            var customer_no = chat_id.substring(0, chat_id.length - 5);
            if (customer_no.length > 12) {
              customer_no = customer_no.substring(0, 10);
            }

            console.log(customer_no);
            var no_customer = BigInt(customer_no);

            const no_user = BigInt(phoneString);

            postTheTagsOFCustomer(no_user, no_customer, chat_id);
            setTimeout(() => {
              document.getElementsByClassName("noteBlock")[0].style.display =
                "none";
            }, 2000);
          }
        } else {
          this.firstChild.style.display = "block";
          this.firstChild.nextSibling.style.display = "none";
        }
      });

    // document
    //   .getElementById("followupCalender")
    //   .addEventListener("change", function (params) {
    //     var customer_no = String(
    //       document.getElementById("phonenumber").innerHTML
    //     );

    //     document.getElementById("sButton1").style.display = "block";
    //     document.getElementById("dateFull").style.display = "flex";
    //     document.getElementById("date1").value = this.value;
    //     document.getElementById("date2").value = this.value;
    //     document.getElementById("followupDate").value = this.value;
    //     let off = new Date().toString();
    //     let offtimeZone = off.substring(24, off.length - 14);

    //     document.getElementById("timeZone").innerHTML = offtimeZone + "Time)";

    //     customer_no = customer_no.substring(1, customer_no.length);
    //     console.log(customer_no);
    //     // var no_customer = BigInt(customer_no);

    //     // const no_user = BigInt(phoneString);

    //     // postTheTagsOFCustomer(no_user, no_customer);
    //   });

    document
      .getElementById("submitCrmData")
      .addEventListener("click", function (params) {
        var chat_id = active_chat_id;

        var customer_no = chat_id.substring(0, chat_id.length - 5);
        if (customer_no.length > 12) {
          customer_no = customer_no.substring(0, 10);
        }

        console.log(customer_no);
        var no_customer = BigInt(customer_no);

        const no_user = BigInt(phoneString);

        if (
          document.getElementById("followupDate").value ||
          document.getElementById("noteinfo").value
        ) {
          if (!document.getElementById("followupDate").value)
            alert("Please select a followup date for the note.");
          else if (!document.getElementById("noteinfo").value) {
            alert("Please write a note text.");
          } else if (
            document.getElementById("followupDate").value &&
            document.getElementById("noteinfo").value
          ) {
            postTheTagsOFCustomer(no_user, no_customer, chat_id);
          }
        } else {
          postTheTagsOFCustomer(no_user, no_customer, chat_id);
        }
      });
  }
}
// fucntion of get contact name through chat id
// it send a post message to wapi script and the wapi script send the name
// we recieve from the window.addeventlistenre function and set the contact name in schedule box and info section
function getContactsName(id) {
  window.postMessage(
    { id: id, cmd: "getContact", direction: "from-content-script" },
    "*"
  );
}

// function to open a chat by chat id
// it also sends window.postmessage and wapi gets the id
// wapi script does the rest to open the chat
function openChat(id) {
  // chrome.storage.sync.set({ message: message });
  //   chrome.storage.sync.set({ count: 1 });
  //   chrome.storage.sync.set({ phone: phonenum }, function () {
  //     console.log(phonenum, "is saved");
  //   });

  //   chrome.runtime.sendMessage({ manageMischief: true });
  console.log("opening chat from content",id);
  window.postMessage(
    { id: id, cmd: "openChat", direction: "from-content-script" },
    "*"
  );
}

var isInfoAppends = false;

//customerinfofinder handles all the dom of the chat section
// which includes setting up the schedule section for new chat
// setting up info section for new chat/old chat
// it is also used to update the latest info about the chat
// and the latest info about the scheduled messages
window.customerInfoFinder = function customerInfoFinder() {
  //this is to clear all the inforamtion in the schedulesection popup
  fillDefaultScheduleSection();
  //this is to clear any scheduled messages box if any
  if (document.getElementsByClassName("scheduled-message")[0]) {
    console.log("found a message and removing it");
    document.querySelectorAll(".scheduled-message").forEach((e) => e.remove());
  }
  //if we do not have the schedule button in chat then this function appends it
  // and sets the event listener for premium and basic user
  if (!document.getElementById("schedulingButton")) {
    var scheduleButton = document.createElement("div");
    scheduleButton.innerHTML =
      "<svg class='MuiSvgIcon-root' focusable='false' viewBox='0 0 24 24' aria-hidden='true'><path d='M7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm1-11h-2v3H8v2h3v3h2v-3h3v-2h-3V9z'></path></svg>";
    scheduleButton.style =
      "    margin-top: 5px;margin-left: 6px;color: royalblue;";
    scheduleButton.setAttribute("id", "schedulingButton");
    document.getElementsByClassName("_3HQNh _1Ae7k")[0].append(scheduleButton);

    scheduleButton.addEventListener("click", function (params) {
      if (isExpired == true) {
        if (customerScheduleArr.length != 0) {
          var fugo = 0;
          customerScheduleArr.forEach((element) => {
            if (element.status == 0) {
              fugo = 1;
              console.log("premium popup 2 ");
              display_price();
              // document.getElementById("pricing__").style.display="block";
              // document.getElementById("PremiumPopup").style.display = "block";
              // document.getElementById("PremiumPopup").style.backgroundImage.src=chrome.runtime.getURL("b_price.png");
              
              document.getElementsByClassName(
                "scheduleOverlay"
              )[0].style.display = "block";
            }
          });
          if (fugo == 0) {
            document.getElementById("scheduleSectionFull").style.display =
              "block";
            document.getElementsByClassName(
              "scheduleOverlay"
            )[0].style.display = "block";
          }
        } else {
          document.getElementById("scheduleSectionFull").style.display =
            "block";
          document.getElementsByClassName("scheduleOverlay")[0].style.display =
            "block";
        }
      } else {
        document.getElementById("scheduleSectionFull").style.display = "block";
        document.getElementsByClassName("scheduleOverlay")[0].style.display =
          "block";
      }
    });
  }

  var userId;

  userId = active_chat_id;
  //this getcontact name function sets the name of the chat into the infosection and scheduled section popup
  getContactsName(userId);

  //customer schedule arr is a global array which stores the data of all present and past scheduled messages for the user
  // we loop through and check if this chat if having a scheduled message or not
  // if we find then we update the schedule section popup
  // and append the scheduled box into the chat
  customerScheduleArr.forEach((element) => {
    if (element.chat_id == userId) {
      // this is used to create the scheduled box
      var time =
        element.time.substring(0, 10) + " " + element.time.substring(11, 16);
      var scheduledObject = getScheduledObject(
        element.message,
        time,
        element.status
      );
      console.log("appending starts");
      // if message is scheduled or failed we append the box into the chat
      if (element.status != 1) {
        console.log("found users with status 0 or -1");
        fillInfoOfScheduleSection(element);
        if (!document.getElementsByClassName("scheduled-message")[0]) {
          document.getElementsByClassName("y8WcF")[0].append(scheduledObject);

          var myElement =
            document.getElementsByClassName("scheduled-message")[0];
          var topPos = myElement.offsetTop;
          console.log(topPos);
          document
            .getElementById("main")
            .getElementsByClassName("_33LGR")[0].style.overflowY = "scroll";
          document
            .getElementById("main")
            .getElementsByClassName("_33LGR")[0].scrollTop = 1770;
        }
      }
    }
  });

  //appending info section in chats
  if (!document.getElementById("infoSection")) {
    var mainObject = document.getElementById("main");
    var headerFlex = mainObject.getElementsByTagName("header")[0];

    var infosection = headerFlex.getElementsByClassName("_1QVfy _3UaCz")[0];

    var infoButton = document.createElement("div");
    var infoTabChat = document.createElement("div");

    infoButton.innerHTML =
      "<div role='button' id='infoSection' style='    background: #0074fc; border-radius: 12px; color: white;' class='_VDboCREG'><div><div class='us699'><svg style='fill:white' class='MuiSvgIcon-root' focusable='false' viewBox='0 0 24 24' aria-hidden='true'><path d='M7 14l5-5 5 5H7z'></path></svg><span class='MuiBadge-root'><span style='padding: 8px;color:white;'>Info</span><span class='MuiBadge-badge MuiBadge-anchorOriginTopRightRectangle MuiBadge-colorPrimary MuiBadge-invisible'></span></span></div></div></div>";

    var fb312 = document.createElement("div");
    fb312.innerHTML = "<img  id = 'followupDateNew' src='' alt=''>";

    infosection.insertBefore(infoButton, infosection.firstChild);
    infosection.insertBefore(fb312, infosection.firstChild);
    var noteToRemember = document.createElement("div");
    noteToRemember.classList.add("noteBlock");
    noteToRemember.innerHTML =
      "<div class= 'noteRem1' ><div class='noteRem2'><h6 class='noteText' style='padding:8px;font-weight:400;'>Add Reminder Note and Followup Date</h6><div class ='noteblock1_2'><input id='noteInfo1' name='notesName' placeholder='Note To Remember..'autocomplete=off > <div role='button'id='noteSubmit' style='display:flex;align-items:center ;pointer-events:auto;margin-top:3px; height:1.5em; width:1.5em;'><svg aria-hidden=true class='MuiSvgIcon-root-2199 _1ijF1D651fhcsls9paFVg5 okay'focusable='false' style='cursor:pointer' viewBox='0 0 24 24'><path d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'></path></svg><svg style='font-size:1.2em; display:none;' class='MuiSvgIcon-root MuiSvgIcon-fontSizeInherit edit' focusable='false' viewBox='0 0 24 24' aria-hidden='true'><path d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'></path></svg></div></div></div></div>";
    mainObject.insertBefore(
      noteToRemember,
      mainObject.firstChild.nextSibling.nextSibling
    );

    fetch(chrome.runtime.getURL("/infoTab.html"))
      .then((r) => r.text())
      .then((html) => {
        mainObject.insertAdjacentHTML("beforeend", html);

        var followupBox = document.createElement("div");
        if (!document.getElementById("followupDateBox")) {
          followupBox.innerHTML =
            "<div role='button' id='followupDateBox' style='display:none;flex-direction: column;border: 1px solid black;margin-right:32px;text-align:center;margin-top: 2px;font-size: 13px;width: 39px;height: 37px;border-radius: 4px;'><input id='followupCalender' type='date' style='    display: none;position: absolute;top: 9px;margin-left:-20px;border: 0;background: transparent;opacity: 0;width: 52px;' >  <div id='monthTitle' style='    background: #0074fc; color: white;  border-radius: 4px;'></div>  <p id='dateTitle'style='color: black;margin: 0;'></p></div>";
        }
        infosection.insertBefore(followupBox, infosection.firstChild);

        crmFormFunction();

        settingUpTags();
        console.log("appended info");
        console.log(headerFlex);
        if (headerFlex.getElementsByTagName("img")[0]) {
          document.getElementById("demouser").src =
            headerFlex.getElementsByTagName("img")[0].src;
        } else {
          document.getElementById("demouser").src =
            chrome.runtime.getURL("demouser.png");
        }
        var faag = 0;
        console.log(customerArray)
        customerListArray.forEach((element) => {
          if (element.chat_id == userId) {
            faag = 1;
            console.log(getTheTagsOFCustomer(element),"yes");
        
          }
        });
        if (!faag) {
          console.log( getTheDefaultTags(),"yess");
        }

        console.log(userId);

        document.getElementById("phonenumber").innerHTML = userId;
        getContactsName(userId);
      });

    infoButton.addEventListener("click", function (params) {
      console.log("info button is clicked");
      if (!document.getElementById("activeSvg")) {
        document.getElementById("infoTabChat").style.display = "block";
        infoButton.getElementsByClassName("us699")[0].innerHTML =
          "<svg class='MuiSvgIcon-root ' id='activeSvg' focusable='false' viewBox='0 0 24 24' aria-hidden='true' style='color: white;fill:white;'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 12l-4-4h8l-4 4z'></path></svg><span class='MuiBadge-root'><span style='padding: 8px;color:white;'>Info</span><span class='MuiBadge-badge MuiBadge-anchorOriginTopRightRectangle MuiBadge-colorPrimary MuiBadge-invisible'></span></span>";
      } else {
        document.getElementById("infoTabChat").style.display = "none";
        infoButton.innerHTML =
          "<div role='button' id='infoSection' style='    background: #0074fc; border-radius: 12px; color: white;' class='_VDboCREG'><div><div class='us699'><svg style='fill:white' class='MuiSvgIcon-root' focusable='false' viewBox='0 0 24 24' aria-hidden='true'><path d='M7 14l5-5 5 5H7z'></path></svg><span class='MuiBadge-root'><span style='padding: 8px;color:white;'>Info</span><span class='MuiBadge-badge MuiBadge-anchorOriginTopRightRectangle MuiBadge-colorPrimary MuiBadge-invisible'></span></span></div></div></div>";
      }
    });
  }
};

function setMediaLayout() {
  var object1 = document.getElementsByClassName("overlay _26Bcu")[0];

  if (typeof object1 != undefined && object1 != null) {
    object1.style = "right:348px; width: auto;";
  }
}

function setLayout() {
  var object2 = document.getElementsByClassName("_3QfZd two")[0];

  if (typeof object2 != undefined && object2 != null) {
    object2.style = "height:100%;width:100%;top:0px;";
    return "success";
  }

  return null;
}
// this funtion updates the tags array every time a new tag is added or so
// we call this function when the postthetagsofcustomer() is called
function settingUpTags() {
  customerListArray.forEach((element) => {
    element.tags.forEach((element) => {
      if (element.TagName) customerTags.push(element.TagName);
    });
  });
  customerTags = [...new Set(customerTags)];

  // console.log(customerListArray);
  document.getElementById("customertaglist").innerHTML = "";
  document.getElementById("taglistcheckbox").innerHTML = "";
  customerTags.forEach((element) => {
    var div = document.createElement("div");

    var input = document.createElement("input");
    input.type = "checkbox";

    var label = document.createElement("label");
    label.innerHTML = element;

    div.append(input, label);

    document.getElementById("taglistcheckbox").append(div);

    document
      .getElementById("taglistcheckbox")
      .lastChild.getElementsByTagName("input")[0]
      .addEventListener("change", function (params) {
        if (this.checked == true) {
          filterTagArr.push(this.nextElementSibling.innerHTML);
          // console.log(filterTagArr);

          searchTheResult(
            filterTagArr,
            document.getElementById("filterLevelInput").value
          );
        } else {
          filterTagArr = filterTagArr.filter((element) => {
            return element != this.nextElementSibling.innerHTML;
          });
          // console.log(filterTagArr);
          searchTheResult(
            filterTagArr,
            document.getElementById("filterLevelInput").value
          );
        }
      });

    var option = document.createElement("option");
    option.innerHTML = element;
    document.getElementById("customertaglist").append(option);
  });
  document.getElementById("taglistcheckbox2").innerHTML = "";
  customerTags.forEach((element) => {
    var div = document.createElement("div");

    var input = document.createElement("input");
    input.type = "checkbox";

    var label = document.createElement("label");
    label.innerHTML = element;

    div.append(input, label);

    document.getElementById("taglistcheckbox2").append(div);
    document
      .getElementById("taglistcheckbox2")
      .lastChild.getElementsByTagName("input")[0]
      .addEventListener("change", function (params) {
        if (this.checked == true) {
          filterTagPendingArr.push(this.nextElementSibling.innerHTML);
          // console.log(filterTagPendingArr);

          searchTheResultPendingFollowUp(
            filterTagPendingArr,
            document.getElementById("filterLevelInput2").value
          );
        } else {
          filterTagPendingArr = filterTagPendingArr.filter((element) => {
            return element != this.nextElementSibling.innerHTML;
          });
          // console.log(filterTagPendingArr);
          searchTheResultPendingFollowUp(
            filterTagPendingArr,
            document.getElementById("filterLevelInput2").value
          );
        }
      });
  });
}

function setImage() {
  var iconDemoUser = document.getElementById("demouser");

  // iconWhatsapp.src = chrome.runtime.getURL("whatsAppIcon.svg");
  if (typeof iconDemoUser != undefined && iconDemoUser != null) {
    iconDemoUser.style = "height: 40px;width= 40px;";
    iconDemoUser.src = chrome.runtime.getURL("demouser.png");

    var iconWhatzapp = document.getElementById("logo");

    iconWhatzapp.src = chrome.runtime.getURL("assets/icons/icon.png");

    return "success";
  }

  return null;
}
// to check the validity of the user
function validityChecker(params) {
  let currdate = new Date();

  let currYear = currdate.getFullYear();

  let currMonth = currdate.getMonth() + 1;

  let currDate = currdate.getDate();

  fetch(
    "https://eazybe.com/api/v1/whatzapp/getCreditHistory?" +
      new URLSearchParams({
        mobile: phoneString,
      })
  )
    .then((resp) => resp.json())
    .then(function (response) {
      isSignup = true;
      var dateLeft = response.data[0].expiry_date.substr(0, 10);
      var expiryYear = parseInt(dateLeft.substring(0, 4));
      var expiryMonth = parseInt(dateLeft.substring(5, 7));
      var expiryDate = parseInt(dateLeft.substring(8, 11));

      if (
        currYear > expiryYear ||
        (currYear == expiryYear && currMonth > expiryMonth) ||
        (currYear == expiryYear &&
          currMonth == expiryMonth &&
          currDate > expiryDate)
      ) {
        console.log("Expired subscription");

        isExpired = true;
              
        document.getElementById("validity").innerHTML =
          "Unlock more features now!";

        // document.getElementById("pricing").style.display = "block";
        document.getElementsByClassName("rechargeButton")[1].style.display =
          "block";
        document.getElementsByClassName("rechargeButton")[0].style.display =
          "none";
      } else {
        const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        const firstDate = new Date(currYear, currMonth, currDate);
        const secondDate = new Date(expiryYear, expiryMonth, expiryDate);

        const diffDays = Math.round(
          Math.abs((firstDate - secondDate) / oneDay)
        );
        document.getElementsByClassName("rechargeButton")[1].style.display =
          "none";
        document.getElementsByClassName("rechargeButton")[0].style.display =
          "block";
        document.getElementById("validity-value").innerHTML =
          diffDays + " " + "Days";
      }
    })
    .catch(function (error) {
      console.log(error);
    });
}

var globalContacts = [];

//
function findnumber() {
  let currdate = new Date();

  let currYear = currdate.getFullYear();

  let currMonth = currdate.getMonth() + 1;

  let currDate = currdate.getDate();

  // ​    let currDate=30;
  presentDate = currDate + "/" + currMonth + "/" + currYear;
  //adding new add user functinality in web whatsapp

  var addUserSvg = document.createElement("div");
  addUserSvg.style =
    "padding:8px;color: #0074fc;display:flex;flex-direction:column;";

  addUserSvg.title = "Open chat by Phone Number";

  addUserSvg.innerHTML =
    "<svg class='MuiSvgIcon-root' focusable='false' viewBox='0 0 24 24' aria-hidden='true'><path d='M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'></path></svg><div class ='underline' style='margin-left:7px;'></div>";

  var scheduledList = document.createElement("div");
  scheduledList.innerHTML =
    "<div class='' style='padding:8px; color: #0074fc;display:flex;flex-direction:column;' title='List of scheduled messages'><svg class='MuiSvgIcon-root' aria-hidden='true' focusable='false' data-prefix='fas' data-icon='user-clock' class='svg-inline--fa fa-user-clock fa-w-20' role='img' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 512'><path fill='currentColor' d='M496 224c-79.6 0-144 64.4-144 144s64.4 144 144 144 144-64.4 144-144-64.4-144-144-144zm64 150.3c0 5.3-4.4 9.7-9.7 9.7h-60.6c-5.3 0-9.7-4.4-9.7-9.7v-76.6c0-5.3 4.4-9.7 9.7-9.7h12.6c5.3 0 9.7 4.4 9.7 9.7V352h38.3c5.3 0 9.7 4.4 9.7 9.7v12.6zM320 368c0-27.8 6.7-54.1 18.2-77.5-8-1.5-16.2-2.5-24.6-2.5h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h347.1c-45.3-31.9-75.1-84.5-75.1-144zm-96-112c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128z'></path></svg><div class ='underline'style='margin-right:4px;'></div></div>";

  var followupList = document.createElement("div");
  followupList.role = "button";
  followupList.style = "padding:8px;";
  followupList.title = "List of Customers";
  followupList.innerHTML =
    "<div class='' style='padding:8px;color: #0074fc;display:flex;flex-direction:column;' title='List of Followups'><svg class='MuiSvgIcon-root' focusable='false' viewBox='0 0 24 24' aria-hidden='true'><path d='M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z'></path></svg><div class ='underline'></div></div>";
  var campainBtn=document.createElement("div");
  campainBtn.role="button";
  campainBtn.style="padding:8px;";
  campainBtn.title="campain";
  span=document.createElement("span");
  span.className="material-icons";
  span.style="font-size: 30px;  padding-top: 5px;  color: blue;"
  span.innerHTML="campaign";
  campainBtn.append(span);
  // campainBtn.innerHTML=    "<span class=`material-icons`>  campaign  </span>";
  // campainBtn.innerHTML="<svg class='MuiSvgIcon-root' focusable='false' viewBox='0 0 24 24' aria-hidden='true' style=''></svg>"
  // document.getElementById("side").style.width="400px";
  document
    .getElementsByClassName("_1QVfy _3UaCz")[0]
    .getElementsByTagName("span")[0]
    .insertBefore(
      scheduledList,

      document
        .getElementsByClassName("_1QVfy _3UaCz")[0]
        .getElementsByTagName("span")[0].firstChild
    );

    document
    .getElementsByClassName("_1QVfy _3UaCz")[0]
    .getElementsByTagName("span")[0]
    .insertBefore(
      campainBtn,

      document
        .getElementsByClassName("_1QVfy _3UaCz")[0]
        .getElementsByTagName("span")[0].firstChild
    );
  
   
    campainBtn.addEventListener("click",function()
      {
        chat_id="919911747454@c.us"
        id="919911747454@c.us"
      window.postMessage(
        { id: id, cmd: "openChat", direction: "from-content-script" },
        "*"
      );

      // window.postMessage(
      //   {
      //     cmd: "findUserId",
      //     direction: "from-content-script",
      //   },
      //   "*"
      // );

      // window.postMessage(
      //   { cmd: "getContactId", direction: "from-content-script" },
      //   "*"
      // );


      // window.postMessage(
      //   { id: id, cmd: "getContact", direction: "from-content-script" },
      //   "*"
      // );

      //   message="hello";
      // window.postMessage(
      //   {
      //     id: chat_id,
      //     text: message,
      //     cmd: "sendMessage",
      //     direction: "from-content-script",
      //     message: "Message from the page",
      //   },
      //   "*"
      // )










        // document.getElementById("campain").style.display= "block";
        // document.getElementsByClassName("scheduleOverlay")[0].style.display ="block";
        // setTheJavascriptincampainPage();       

      })

    
  document
    .getElementsByClassName("_1QVfy _3UaCz")[0]
    .getElementsByTagName("span")[0]
    .insertBefore(
      followupList,

      document
        .getElementsByClassName("_1QVfy _3UaCz")[0]
        .getElementsByTagName("span")[0].firstChild
    );

  document
    .getElementsByClassName("_1QVfy _3UaCz")[0]
    .getElementsByTagName("span")[0]
    .insertBefore(
      addUserSvg,

      document
        .getElementsByClassName("_1QVfy _3UaCz")[0]
        .getElementsByTagName("span")[0].firstChild
    );

  scheduleSectionPopup();
  console.log(document.getElementsByClassName("_1ljzS pnYZD")[0]);

  addUserSvg.addEventListener("click", function (params) {
    document.getElementById("newUserMobile").style.display = "flex";
    document.getElementById("overlayPhone").style.display = "block";
    document.getElementById("textInfoNewUser").style.display = "block";
    document.getElementById("addNewOkay").style.display = "flex";
    addUserSvg.getElementsByClassName("underline")[0].style.background =
      "#0074fc";
  });

  var scheduledListObject = document.getElementById("scheduledList");
  scheduledListObject.setAttribute("id", "scheduled-list");
  scheduledListObject.style =
    "    display: none;     position: fixed;  z-index: 11120; left: 0px; border: 0px; padding: 0px; top: 90px;";

  document
    .getElementById("pane-side")
    .insertBefore(
      scheduledListObject,
      document.getElementById("pane-side").firstChild
    );

  followupList.addEventListener("click", function (params) {
    document.getElementById("scheduled-list").style.display = "block";
    document.getElementById("tab-4").checked = true;
    document.getElementById("pane-side").style.zIndex = 11000;
    showFol = 1;
    showSc = 0;
    document.getElementById("searchTheCustomer").style.display = "block";
    document.getElementById("searchTheCustomer2").style.display = "block";
    document.getElementsByClassName("underline")[1].style.background =
      "#0074fc";
    getCustomerList(customerListArray);
  });

  
  scheduledList.addEventListener("click", function (params) {
    document.getElementById("scheduled-list").style.display = "block";
    document.getElementById("tab-4").checked = true;
    document.getElementById("pane-side").style.zIndex = 11000;
    showSc = 1;
    showFol = 0;

    document.getElementById("searchTheCustomer").style.display = "none";
    document.getElementById("searchTheCustomer2").style.display = "none";
    document.getElementsByClassName("underline")[2].style.background =
      "#0074fc";

    fetch(
      "https://eazybe.com/api/v1/whatzapp/getCustomerSchedule?" +
        new URLSearchParams({
          user_mobile_No: no_user,
        })
    )
      .then((resp) => resp.json())
      .then(function (response) {
        var object1 = response.data;
        console.log(object1);
        customerScheduleArr = object1;
      })
      .catch(function (error) {
        console.log(error);
      });

    displayScheduledList(customerScheduleArr, 0);
  });

  document
    .getElementById("upgrade")
    .getElementsByTagName("button")[1]
    .addEventListener("click", function (params) {
      document.getElementById("scheduled-list").style.display = "none";
      document.getElementById("pane-side").style.zIndex = 0;
      this.style.display = "none";
      document.getElementsByClassName("underline")[1].style.background = "none";
      document.getElementsByClassName("underline")[2].style.background = "none";
    });

  var scheduleOverlay = document.createElement("div");
  scheduleOverlay.classList.add("scheduleOverlay");
  console.log("premium pop up__3");

  var premiumPopup = document.getElementById("PremiumPopup");


  var updatePopup = document.getElementById("updatePopup");
  document.getElementById("updateImg").src = chrome.runtime.getURL(
    "assets/img/update.png"
  );

  campain=document.getElementById("campain");

  document
    .getElementById("app")
    .append(scheduleOverlay, premiumPopup, campain, updatePopup);

  scheduleOverlay.addEventListener("click", function (params) {
    document.getElementById("scheduleSectionFull").style.display = "none";
    document.getElementById("PremiumPopup").style.display = "none";
    console.log("premium pop up__4");


    this.style.display = "none";
  });
  // document
  //   .getElementsByClassName("JnmQF _3QmOg")[0]
  //   .append(document.getElementById("addingNewUser11"));

  var uninstallUrl = "https://eazybe.com/feedback/" + phoneString;

  chrome.runtime.sendMessage(uninstallUrl);

  // api calls
  fetch(
    "https://eazybe.com/api/v1/whatzapp/getCreditHistory?" +
      new URLSearchParams({
        mobile: phoneString,
      })
  )
    .then((resp) => resp.json())
    .then(function (response) {
      isSignup = true;
      var dateLeft = response.data[0].expiry_date.substr(0, 10);
      var expiryYear = parseInt(dateLeft.substring(0, 4));
      var expiryMonth = parseInt(dateLeft.substring(5, 7));
      var expiryDate = parseInt(dateLeft.substring(8, 11));

      if (
        currYear > expiryYear ||
        (currYear == expiryYear && currMonth > expiryMonth) ||
        (currYear == expiryYear &&
          currMonth == expiryMonth &&
          currDate > expiryDate)
      ) {
        console.log("Expired subscription");

        isExpired = true;
        document.getElementById("validity").innerHTML =
          "Unlock more features now!";

        document
          .getElementById("side")
          .insertBefore(
            document.getElementById("upgrade"),
            document.getElementById("side").firstChild.nextSibling
          );
        document.getElementById("validity").style.display = "block";
        document.getElementsByClassName("rechargeButton")[0].style.display =
          "none";
        document.getElementsByClassName("rechargeButton")[1].style.display =
          "block";
      } else {
        const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        const firstDate = new Date(currYear, currMonth, currDate);
        const secondDate = new Date(expiryYear, expiryMonth, expiryDate);

        const diffDays = Math.round(
          Math.abs((firstDate - secondDate) / oneDay)
        );
        isExpired = false;

        document.getElementById("validity-value").innerHTML =
          diffDays + " " + "Days";

        document
          .getElementById("side")
          .insertBefore(
            document.getElementById("upgrade"),
            document.getElementById("side").firstChild.nextSibling
          );

        document.getElementsByClassName("rechargeButton")[0].style.display =
          "block";
        document.getElementsByClassName("rechargeButton")[1].style.display =
          "none";
      }
    })
    .catch(function (error) {
      console.log(error);
      console.log("adding user automatically");
      fetch(
        "https://eazybe.com/api/v1/whatzapp/autosignup?",

        {
          method: "POST",

          body: JSON.stringify({
            mobile: phoneString,
          }),

          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
        }
      )
        .then((response) => response.json())

        .then((json) => {
          console.log(json);
        });
      isExpired = true;
      document.getElementById("validity").innerHTML =
        "Unlock more features now!";

      document
        .getElementById("side")
        .insertBefore(
          document.getElementById("upgrade"),
          document.getElementById("side").firstChild.nextSibling
        );
      document.getElementById("validity").style.display = "block";
      document.getElementsByClassName("rechargeButton")[1].style.display =
        "block";
      document.getElementsByClassName("rechargeButton")[0].style.display =
        "none";
    });

  const no_user = BigInt(phoneString);

  fetch(
    "https://eazybe.com/api/v1/whatzapp/customerInfoList?" +
      new URLSearchParams({
        user_mobile_No: no_user,
      })
  )
    .then((resp) => resp.json())
    .then(function (response) {
      var object = response.data;
      customerListArray = object;
      document.getElementsByClassName("uppertablabel")[1].innerHTML = "";
      document.getElementsByClassName("uppertablabel")[1].innerHTML =
        "Followup ";
      document.getElementsByClassName("uppertablabel")[1].innerHTML +=
        "(" + object.length + ")";

      getCustomerList(object);
      document
        .getElementById("upgrade")
        .getElementsByTagName("button")[1].style.display = "none";
    })
    .catch(function (error) {
      console.log(error);
    });

  document.getElementById("searchTheCustomer").style.zIndex = 2;
  document.getElementById("searchTheCustomer2").style.zIndex = 1;

  document.getElementById("tab-1").addEventListener("click", function () {
    document.getElementsByClassName("sendMessageList")[0].style.display =
      "block";
    fetch(
      "https://eazybe.com/api/v1/whatzapp/customerInfoList?" +
        new URLSearchParams({
          user_mobile_No: no_user,
        })
    )
      .then((resp) => resp.json())
      .then(function (response) {
        var object = response.data;

        customerListArray = object;
        validityChecker();
        getCustomerList(object);
      })
      .catch(function (error) {
        console.log(error);
      });
  });

  document.getElementById("tab-3").addEventListener("click", function (params) {
    document.getElementsByClassName("sendMessageList")[0].style.display =
      "none";
  });

  document.getElementById("tab-4").addEventListener("click", function (params) {
    if (showSc == 1) {
      document.getElementById("searchTheCustomer").style.display = "none";
      document.getElementById("searchTheCustomer2").style.display = "none";
      displayScheduledList(customerScheduleArr, 0);
    } else if (showFol == 1) {
      document.getElementById("searchTheCustomer").style.display = "block";
      document.getElementById("searchTheCustomer2").style.display = "block";
      fetch(
        "https://eazybe.com/api/v1/whatzapp/customerInfoList?" +
          new URLSearchParams({
            user_mobile_No: no_user,
          })
      )
        .then((resp) => resp.json())
        .then(function (response) {
          var object = response.data;

          customerListArray = object;
          validityChecker();
          getCustomerList(object);
        })
        .catch(function (error) {
          console.log(error);
        });
    }

    document.getElementsByClassName("sendMessageList")[0].style.display =
      "block";
    document.getElementById("searchTheCustomer").style.zIndex = 2;
    document.getElementById("searchTheCustomer2").style.zIndex = 1;
  });

  document.getElementById("tab-8").addEventListener("click", function (params) {
    displayScheduledList(customerScheduleArr, -1);
  });

  document.getElementById("tab-5").addEventListener("click", function () {
    console.log("past scheduled called");
    if (showSc == 1) {
      document.getElementById("searchTheCustomer").style.display = "none";
      document.getElementById("searchTheCustomer2").style.display = "none";

      displayScheduledList(customerScheduleArr, 1);
    } else if (showFol == 1) {
      document.getElementById("searchTheCustomer").style.display = "block";
      document.getElementById("searchTheCustomer2").style.display = "block";
      presentDate = currDate + "/" + currMonth + "/" + currYear;
      document.getElementById("searchTheCustomer").style.zIndex = 1;
      document.getElementById("searchTheCustomer2").style.zIndex = 2;
      var dateTime = new Date(
        new Date().toString().split("GMT")[0] + " UTC"
      ).toISOString();
      fetch(
        "https://eazybe.com/api/v1/whatzapp/customerFollowups?" +
          new URLSearchParams({
            user_mobile_No: no_user,
            follow_up_date: presentDate,
            presentTime: dateTime,
          })
      )
        .then((resp) => resp.json())
        .then(function (response) {
          var object1 = response.data;

          customerFollowupList = object1;
          console.log(object1);
          validityChecker();
          getFollowUpPendingList(object1);
        })
        .catch(function (error) {
          console.log(error);
        });
    }

    document.getElementsByClassName("sendMessageList")[0].style.display =
      "block";
    document.getElementById("searchTheCustomer").style.zIndex = 1;
    document.getElementById("searchTheCustomer2").style.zIndex = 2;
  });

  document
    .getElementById("newPhone")
    .addEventListener("input", function (params) {
      document
        .getElementById("gflag")
        .querySelectorAll("option")
        .forEach((element) => {
          var countrycode;
          if (this.value.length > 10) {
            countrycode = this.value.substr(0, this.value.length - 10);
            console.log(countrycode);
            if (element.value == countrycode) {
              element.selected = true;
            }
          } else {
            if (element.value == this.value) {
              element.selected = true;
            }
          }
        });
    });

  document
    .getElementById("gflag")
    .addEventListener("change", function (params) {
      document.getElementById("newPhone").value = this.value;
    });

  window.addEventListener("click", function name(event) {
    if (
      event.target.id != "messageTextFollowup" &&
      event.target.id != "sendMessageAll"
    ) {
      var textbox = document.getElementById("messageTextFollowup");
      if (textbox.style.display == "block") {
        textbox.style.display = "none";
        document.getElementById("overlayObject").style.display = "none";
      }
    }
  });

  document
    .getElementsByClassName("rechargeButton")[1]
    .addEventListener("click", function (params) {
      console.log("premium pop up__5");
      display_price();

      // document.getElementById("PremiumPopup").style.display = "block";
      // // document.getElementById("PremiumPopup").style.height="fit-content";
      // document.getElementById("PremiumPopup").style.overflow="scroll";
      // document.getElementById("PremiumPopup").style.position="position: sticky;";    
      // document.getElementsByClassName("scheduleOverlay")[0].style.display =
      //   "block";
    });
    
  
  document
    .getElementById("sendMessageAll")
    .addEventListener("click", function (params) {
      var messageTextBox = document.getElementById("messageTextFollowup");
      console.log(messageTextBox);
      if (messageTextBox.style.display == "none") {
        messageTextBox.style.display = "block";
        document.getElementById("overlayObject").style.display = "block";
        // document.getElementById("sendMessageAll1").style.display = "block";
      } else if (messageTextBox.style.display == "block") {
        messageTextBox.style.display = "none";
        isRunning = true;

        count = 0;
        count2 = 10;
        noOfSent = 1;
        bPercent = 10;
        if (messageTextBox.value != "") {
          fbqEventCatcher("Subscribe");

          redraw2();
          broadcastMessages(customerArray, messageTextBox.value);
        }

        // document.getElementById("sendMessageAll1").style.display = "none";
        document.getElementById("overlayObject").style.display = "none";
        document.getElementById("messageTextFollowup").value = "";
      }
    });

  document.getElementById("isRegistered").action += phoneString;
  document.getElementById("premiumButton").href =
    document.getElementById("isRegistered").action;

  console.log(phoneString);

  fetch(
    "https://eazybe.com/api/v1/whatzapp/getCustomerSchedule?" +
      new URLSearchParams({
        user_mobile_No: no_user,
      })
  )
    .then((resp) => resp.json())
    .then(function (response) {
      var object1 = response.data;
      console.log(object1);
      customerScheduleArr = object1;
    })
    .catch(function (error) {
      console.log(error);
    });

  return phoneString;
}

function display_price()
{
  console.log("display_price is clicked");
  document.getElementById("PremiumPopup").style.display = "block";
  // document.getElementById("PremiumPopup").style="height:90%";
  document.getElementById("PremiumPopup").style.height="90%";
  document.getElementById("PremiumPopup").style.overflow="scroll";
  document.getElementById("PremiumPopup").style.position="position: sticky;";    
  document.getElementsByClassName("scheduleOverlay")[0].style.display =
    "block";
    fetch("https://eazybe.com/api/v1/whatzapp/planList").then((response) => response.json())
    .then((json) => {
      var data=json.plan_list
      var show_monthly_plan=true;
      monthly_button=document.getElementById("monthly_button");
      yearly_button=document.getElementById("yearly_button");

      let datam=[]
      let datay=[]
      for(var i=0;i<data.length;i++)
      {
        if(data[i].isMonthly)
        {
          datam.push(data[i]);
        }
        else
        {
          datay.push(data[i]);
        }

      }

      console.log("datam",datam);
      console.log("datay",datay);
      monthly_button.addEventListener("click",function()
      {
        monthly_button.style.background="#546fff";
        monthly_button.style.color="#fff";
        yearly_button.style.background="#fff";
        yearly_button.style.color="#546fff";
        show_monthly_plan=true;
        var all_span_price=document.getElementsByClassName("span_price_amount");
        // console.log( document.getElementsByClassName("span_price_amount"), document.getElementsByClassNam);
        for(let j=0;j<all_span_price.length;j++)
        {
          console.log(all_span_price[j]);
          all_span_price[j].innerHTML=datam[j].amount;
        }
        var all_span_duration=document.getElementsByClassName("span_price_duration");

        for(var j=0;j<all_span_duration.length;j++)
        {
          all_span_duration[j].innerHTML=" /mo";
        }

      });

      yearly_button.addEventListener("click",function()
      {
          show_monthly_plan=false;
          yearly_button.style.background="#546fff";
          yearly_button.style.color="#fff";
          monthly_button.style.background="#fff";
          monthly_button.style.color="#546fff";

          var all_span_price=document.getElementsByClassName("span_price_amount");
          // console.log( document.getElementsByClassName("span_price_amount"), document.getElementsByClassNam);
          for(let j=0;j<all_span_price.length;j++)
          {
            console.log(all_span_price[j]);
            all_span_price[j].innerHTML=datay[j].amount;
          }

          var all_span_duration=document.getElementsByClassName("span_price_duration");

          console.log(all_span_duration);
          for(var j=0;j<all_span_duration.length;j++)
          {
            all_span_duration[j].innerHTML=" /year";
          }


      })
           
    document.getElementById("card").style.display="none";
      for(var i=0;i<datam.length;i++)
    {
      
      
    
      // console.log(div);
      var card=document.createElement("div");
      var plan_name=document.createElement("div");
      var span_plan_name=document.createElement("span");
      var ratting=document.createElement("div");
      var price=document.createElement("div");
      var feature=document.createElement("div");
      
      card.id="card";
      card.className="card";
      card.style=" margin-left: 25px; margin-bottom:24px ;margin-right: 2px;  display:   flex; align-items: center; flex-direction: column; border:   1px solid #546fff; border-radius: 5px; height: 500px; width: 270px;"
      if(i==2)
      {
        card.style=" margin-left: 25px; margin-bottom:24px ;margin-right: 2px;  display:   flex; align-items: center; flex-direction: column; border:   1px solid #546fff; border-radius: 5px; height: 500px; width: 270px;background-color:#546fff"
        
      }
      
      premium_span=document.createElement("div");

      premium_span.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"width="50" height="50" viewBox="0 0 172 172"style=" fill:#000000;"><g fill="none" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><path d="M0,172v-172h172v172z" fill="#3498db"></path><g fill="#ffffff"><path d="M44.72,6.88c-1.90232,0 -3.44,1.54112 -3.44,3.44v151.36c0,1.23152 0.65688,2.3708 1.72672,2.98313c1.06984,0.61232 2.38376,0.60576 3.44672,-0.01344l39.54656,-23.06547l39.54656,23.06547c0.5332,0.31304 1.13488,0.47031 1.73344,0.47031c0.59168,0 1.18352,-0.15072 1.71328,-0.45687c1.06984,-0.61232 1.72672,-1.75161 1.72672,-2.98313v-47.58219l-6.88,4.40078v37.195l-36.10656,-21.06328c-0.5332,-0.31304 -1.13488,-0.47031 -1.73344,-0.47031c-0.59856,0 -1.20024,0.15727 -1.73344,0.47031l-36.10656,21.06328v-141.9336h75.68v31.66547l1.18922,-3.1175l1.04141,-1.0414c0.7568,-0.7568 2.40977,-2.17032 4.65609,-3.02344v-27.92313c0,-1.89888 -1.53768,-3.44 -3.44,-3.44zM134.375,44.41094c-1.376,0 -2.752,1.032 -3.44,1.72l-8.25735,21.67469l-23.04531,1.37734c-1.376,0 -2.75335,1.02931 -3.09735,2.40531c-0.344,1.376 0.00135,3.09465 1.37735,3.78265l17.54265,14.45203l-5.85203,22.36c-0.344,1.376 0.34535,3.09465 1.37735,3.78266c0.688,0.344 1.37465,0.68531 2.06265,0.68531c0.69144,0 1.38482,-0.34131 2.06938,-0.68531l19.26265,-12.38266l19.26265,12.72531c1.032,1.032 2.75066,0.688 3.78266,0c1.376,-1.032 1.72134,-2.40666 1.37734,-3.78265l-5.84531,-22.36l17.88531,-14.44531c1.032,-1.032 1.37869,-2.41338 1.03469,-3.78938c-0.344,-1.376 -1.72135,-2.40531 -3.09735,-2.40531l-23.05203,-1.37735l-8.25062,-21.66797c-0.344,-1.032 -1.72135,-2.06938 -3.09735,-2.06938zM134.375,57.48563l5.50265,15.48c0.688,1.032 1.72135,2.06265 3.09735,2.06265l16.51469,1.03469l-12.73203,10.32c-1.032,0.688 -1.37197,2.064 -1.02797,3.44l4.12531,15.82266l-13.76,-8.94266c-0.344,-0.344 -1.032,-0.69203 -1.72,-0.69203c-0.69144,0 -1.37465,0.34938 -2.06265,0.34938l-13.76,8.94265l4.12531,-15.82265c0.344,-1.032 0.00403,-2.752 -1.02797,-3.44l-12.73203,-10.32l16.51469,-0.69203c1.376,-0.344 2.40934,-1.02931 3.09734,-2.40531z"></path></g></g></svg>`
      plan_name.className="plan_name";
      plan_name.id="plan_name";
      plan_name.style="margin-top: 26px; margin-bottom: 16px;";
      if(i==2)
      {
        plan_name.style.color="#FFF";
      }
      span_plan_name.style="color: #546fff; font-size: 26px;";
      if(i==2)
      {
        span_plan_name.style.color="#FFF";
      }
      span_plan_name.innerHTML=datam[i].plan_name;
      plan_name.append(span_plan_name);

      ratting.className="ratting";
      ratting.id="ratting";
      ratting.style="font-size: 26px; margin-bottom:0px;"
      

      var no_of_star=data[i].star;
      for(let j=0;j<no_of_star;j++)
      {
        var span_ratting=document.createElement("span");
        span_ratting.style="color: #546fff;";
        if(i==2)
        {
          span_ratting.style.color="#FFF";
        }
        span_ratting.className="material-icons";
        span_ratting.innerHTML="star_rate";
        ratting.append(span_ratting);
      }

    price.id="price";
    price.className='price';
    
    span_price$=document.createElement("span");
    span_price$.style="color: #546fff; font-size: 29px;"
    if(i==2)
    {
      span_price$.style.color="#FFF";
    }
    span_price$.innerHTML="$";

    span_price_amount=document.createElement("span");
    span_price_amount.innerHTML=datam[i].amount;

    span_price_amount.className="span_price_amount";
    span_price_amount.style="color :#546fff";
    if(i==2)
    {
      span_price_amount.style.color="#FFF";
    }
    span_price_amount.style.fontSize="43px";
    
    span_price_duration=document.createElement("span");
    span_price_duration.className="span_price_duration";
    span_price_duration.style="color: #546fff; font-size: 18px;"
    if(i==2)
    {
      span_price_duration.style.color="#FFF";
    }
    span_price_duration.innerHTML=" /mo";

    price.append(span_price$,span_price_amount,span_price_duration);
    
    feature.id="feature";
    feature.className="feature"
    feature.style="display:  flex; align-items: baseline;  justify-content: center; flex-direction: column; align-self:start ;margin-left:20px";

    for(let j=0;j<data[i].offerings.length;j++)
    {
      var statement=document.createElement("div");
      statement.id='statement';
      statement.className="statement";
      statement.style="display:  flex; align-items: center;  justify-content: center; "
      
      feature.append(statement);
      span_statement=document.createElement("span");
      span_statement.className="material-icons";
      span_statement.style=" margin-left: 15px; margin-top: 0px; color: #546fff;";
      span_statement.innerHTML="done";
      p=document.createElement("p");
      p.style="margin-left: 15px; color: #546fff; font-size:14px ;margin-top:2px ;text-align:start";
      if(i==2)
      {
        p.style.color="#FFF";
      }
      p.innerHTML=datam[i].offerings[j];
      statement.append(p);
    

    }

    var pay=document.createElement("div");
    pay.id="pay";
    pay.className="pay"
    pay.style="display: flex;  justify-content: center; margin-top: auto; margin-bottom: 15px; height: 26px;"
    pay_button=document.createElement("button");
    pay_button.style= "width: 100px; bottom: 15px; border-radius: 5px; background-color: black; color:#546fff;";
    pay_button.innerHTML="Pay Now"

    pay.append(pay_button);
    
    if(data[i].amount>0)
    {
      card.append(plan_name,ratting,price,feature,pay);  
    }
    else{
      card.append(plan_name,ratting,price,feature);
    
    }
    document.getElementById("card_container").append(card);
    }
    });    

    
}

//
function broadcastMessages(arr, message) {
  if (isExpired) {
    if (arr.length >= 5) {
      console.log("premium pop up__6");
        display_price();
      // document.getElementById("PremiumPopup").style.display = "block";
      // document.getElementsByClassName("scheduleOverlay")[0].style.display =
      //   "block";
      isRunning = false;
    } else {
      console.log(arr);

      var i = 0;
      var BroadcastInterval = setInterval(() => {
        var chat_id = arr[i].chat_id;
        if(arr[i].chat_id)
        {
          chat_id = arr[i].chat_id;
        }
        else
        {
          chat_id = arr[i];
        }

        window.postMessage(
          {
            id: chat_id,
            text: message,
            cmd: "sendMessage",
            direction: "from-content-script",
            message: "Message from the page",
          },
          "*"
        );
        i++;
        if (i >= arr.length) {
          window.clearInterval(BroadcastInterval);
          isRunning = false;
        }
      }, 10000);

      console.log(isSignup);
      console.log(isExpired);
      validityChecker();
    }
  } else {
    var i = 0;
    var BroadcastInterval = setInterval(() => {
      var chat_id = arr[i].chat_id;
      
      if(arr[i].chat_id)
      {
        chat_id = arr[i].chat_id;
      }
      else
      {
        chat_id = arr[i];
      }
      console.log("sending broadcast", chat_id);
      window.postMessage(
        {
          id: chat_id,
          text: message,
          cmd: "sendMessage",
          direction: "from-content-script",
          message: "Message from the page",
        },
        "*"
      );
      i++;
      if (i >= arr.length) {
        window.clearInterval(BroadcastInterval);
        isRunning = false;
      }
    }, 10000);

    console.log(isSignup);
    console.log(isExpired);
    validityChecker();
  }
}
//progress bar for the sending bulk messages
//send progress bar for followup messaging
var bPercent = 10;
var count = 0;
var count2 = 10;
var noOfSent = 1;
function redraw2() {
  var p = document.getElementById("sendMessageAll");
  p.style.color = "black";
  console.log("redraw2");
  if (isRunning) {
    console.log(isRunning);

    p.style.background =
      "linear-gradient(90deg, #88ff9f " + bPercent + "%, white 0%)";

    if (count < 1) {
      p.innerHTML =
        "Sending Message" + " " + "1" + " " + "of" + " " + customerArray.length;
    } else {
      p.innerHTML =
        "Sending Message" +
        " " +
        noOfSent +
        " " +
        "of" +
        " " +
        customerArray.length;
    }
    count++;

    if (noOfSent != customerArray.length) noOfSent++;

    bPercent += 100 / (parseInt(customerArray.length) - 1);

    setTimeout("redraw2()", 10000);
  } else {
    p.style.background =
      "linear-gradient(90deg, #0074fc " + "100" + "%, white 0%)";
    p.style.color = "white";
    getCustomerList(customerListArray);
  }
}

//converting 12hr format to 24hr format
const convertTime12to24 = (time12h) => {
  const [time, modifier] = time12h.split(" ");

  let [hours, minutes] = time.split(":");

  if (hours === "12") {
    hours = "00";
  }

  if (modifier === "PM") {
    hours = parseInt(hours, 10) + 12;
  }

  return `${hours}:${minutes}`;
};

// javascript enabling for sending message...

function javaEnabling() {
  console.log("Message bhej paa rhe hai.");

  chrome.storage.sync.clear();
  let button = document.getElementById("injectMessage");

  button.addEventListener("click", () => {
    let message = document.getElementById("message").value;
    let phonenum = document.getElementById("phone").value;

    console.log(message, phonenum);
    chrome.storage.sync.set({ message: message });
    chrome.storage.sync.set({ count: 1 });
    chrome.storage.sync.set({ phone: phonenum }, function () {
      console.log(phonenum, "is saved");
    });
    console.log(isSignup);
    console.log(isExpired);
    validityChecker();
    if (isSignup && !isExpired) {
      chrome.runtime.sendMessage({ manageMischief: true });
      document.getElementById("fileUpload").value = "";
      document.getElementById("file-uploaded").innerHTML = "";
      document.getElementById("message").value = "";
    } else alert("Please Recharge your acount to use this feature.");
  });

  document.getElementById("upload").addEventListener("click", UploadProcess);
  document
    .getElementById("upload")
    .addEventListener("click", displayUploadedText);

  function UploadProcess() {
    //Reference the FileUpload element.
    var fileUpload = document.getElementById("fileUpload");
    console.log("uploadprocess started..");

    //Validate whether File is valid Excel file.
    var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.xls|.xlsx)$/;
    if (regex.test(fileUpload.value.toLowerCase())) {
      if (typeof FileReader != "undefined") {
        var reader = new FileReader();

        //For Browsers other than IE.
        if (reader.readAsBinaryString) {
          reader.onload = function (e) {
            GetTableFromExcel(e.target.result);
          };
          reader.readAsBinaryString(fileUpload.files[0]);
        } else {
          //For IE Browser.
          reader.onload = function (e) {
            var data = "";
            var bytes = new Uint8Array(e.target.result);
            for (var i = 0; i < bytes.byteLength; i++) {
              data += String.fromCharCode(bytes[i]);
            }
            GetTableFromExcel(data);
          };
          reader.readAsArrayBuffer(fileUpload.files[0]);
        }
      } else {
        alert("This browser does not support HTML5.");
      }
    } else {
      alert("Please upload a valid Excel file.");
    }
  }
  function GetTableFromExcel(data) {
    //Read the Excel File data in binary
    var workbook = XLSX.read(data, {
      type: "binary",
    });
    //get the name of First Sheet.
    var Sheet = workbook.SheetNames[0];
    //Read all rows from First Sheet into an JSON array.
    var excelRows = XLSX.utils.sheet_to_row_object_array(
      workbook.Sheets[Sheet]
    );

    //Add the data rows from Excel file.
    var phoneNums = [];
    for (var i = 0; i < excelRows.length; i++) {
      console.log(excelRows[i].Phone);
      phoneNums.push(excelRows[i].Phone);
    }
    console.log(phoneNums);
    chrome.storage.sync.set({ phoneNums: phoneNums });
  }

  document.getElementById("fileUpload").onchange = function () {
    //call getFileSelected method
    getFileSelected();
  };

  function getFileSelected() {
    //get the value of the input file element
    var getFileSelected = document.getElementById("file-selected").value;

    //display the results of the input file element
    //you can append something before the getFileSelected value below
    //like an image tag for your icon or a string saying "file selected:"
    //for example.
    document.getElementById("file-selected").innerHTML = "File Selected ";
  }

  function displayUploadedText() {
    document.getElementById("file-selected").innerHTML = "";
    document.getElementById("file-uploaded").innerHTML = "File Uploaded";
  }

  //   document.addEventListener('click', function(e) {
  //     e = e || window.event;
  //     var target = e.target;
  //     console.log(target);
  //         text = target.textContent || target.innerText;
  //         console.log(text);
  // }, false);
}

function fbqEventCatcher(event) {
  var imgFb = document.getElementById("analytics");
  console.log(imgFb);
  if (imgFb) {
    imgFb.src = `https://www.facebook.com/tr?id=577091703261048&ev=${event}&noscript=1`;
  } else {
    var fbpixImg = document.createElement("noscript");
    imgFb = document.createElement("img");
    imgFb.setAttribute("id", "analytics");
    imgFb.height = 1;
    imgFb.width = 1;
    imgFb.style.display = "none";
    imgFb.src = `https://www.facebook.com/tr?id=577091703261048&ev=${event}&noscript=1`;
    fbpixImg.append(imgFb);

    document.getElementsByTagName("head")[0].append(fbpixImg);
  }
}

function newToolInsertCheck() {
  var obj1 = document.getElementById("pane-side");

  if (obj1 !== undefined && obj1 !== null) {
    return "success";
  } else return null;
}

function newTool() {
  console.log("Successfully running content script...");

  var panel = document.createElement("div");
  var popupcssStyle = document.createElement("link");
  var bootstrapStyles = document.createElement("link");
  var otherPanel = document.createElement("div");
  var whatzApp = document.createElement("div");
  var fontcss = document.createElement("link");
  var fontcssnext = document.createElement("link");

  //setting attributes of elements created
  fontcss.setAttribute("rel", "preconnect");
  fontcss.setAttribute("href", "https://fonts.gstatic.com");

  fontcssnext.setAttribute("rel", "stylesheet");
  fontcssnext.setAttribute(
    "href",
    "https://fonts.googleapis.com/css2?family=Poppins:wght@400&display=swap"
  );
  popupcssStyle.setAttribute("type", "text/css");

  popupcssStyle.setAttribute("rel", "stylesheet");

  var hrefOfCss = chrome.runtime.getURL("assets/css/popup.css");
  var hrefOfBoot = chrome.runtime.getURL("assets/css/bootstrap.min.css");

  popupcssStyle.setAttribute("href", hrefOfCss);

  bootstrapStyles.setAttribute("rel", "stylesheet");
  bootstrapStyles.setAttribute("href", hrefOfBoot);
  bootstrapStyles.setAttribute("type", "text/css");

  //styling section (minified css inner html)

  // document
  //   .getElementById("app")
  //   .setAttribute(
  //     "style",
  //     "left: 0;right: 348px;bottom: 0px;height: auto;width: auto;background-color: #fff;"
  //   );

  // document
  //   .getElementsByClassName("_3h3LX")[0]
  //   .setAttribute("style", "position: absolute;");

  fetch(chrome.runtime.getURL("/popup.html"))
    .then((r) => r.text())
    .then((html) => {
      panel.insertAdjacentHTML("beforeend", html);

      whatzApp.setAttribute(
        "style",
        "display:none; grid-template-rows: 1fr;grid-template-columns: 1fr 353px;height: 100vh;"
      );

      panel.setAttribute(
        "style",
        " display:none; overflow: auto; grid-column: 2/3; grid-row: 1/2; z-index: 999;border-left: 1px solid rgba(0,0,0,.08);height:100%;"
      );

      otherPanel.setAttribute(
        "style",
        "display: none; pointer-events: none!important; grid-row: 1/2;grid-column: 1/2;"
      );

      document.body.appendChild(whatzApp);
      whatzApp.append(panel);
      whatzApp.append(otherPanel);
      console.log(document);

      panel.classList.add("whatzapp");
      document
        .getElementsByTagName("head")[0]
        .append(popupcssStyle, bootstrapStyles, fontcss, fontcssnext);

      javaEnabling();
      findnumber();

      document
        .getElementById("addNewOkay1")
        .addEventListener("click", function (params) {
          document.getElementById("newUserMobile").style.display = "none";
          document.getElementById("overlayPhone").style.display = "none";
          document.getElementById("textInfoNewUser").style.display = "none";
          document.getElementById("addNewOkay").style.display = "none";
          let phonenum = document.getElementById("newPhone").value;
          document.getElementsByClassName("underline")[0].style.background =
            "none";
          const chat_id = phonenum + "@c.us";
          active_chat_id = chat_id;
          openChat(chat_id);
          setTimeout(() => {
            customerInfoFinder();
          }, 800);
        });
      document
        .getElementById("addNewOkay2")
        .addEventListener("click", function (params) {
          document.getElementById("newUserMobile").style.display = "none";
          document.getElementById("overlayPhone").style.display = "none";
          document.getElementById("textInfoNewUser").style.display = "none";
          document.getElementById("addNewOkay").style.display = "none";
          document.getElementsByClassName("underline")[0].style.background =
            "none";
        });

      document
        .getElementById("pane-side")
        .insertBefore(
          document.getElementById("addingNewUser11"),
          document.getElementById("pane-side").firstChild
        );
      //         <button id= "sButton1">Schedule message</button>
      //         <div id="scOptions" style="display: none;">
      //            <option>Now</option>
      //            <option>Schedule Later</option>
      //         </div>
      // <input style="display: none;" type="date">
      //      <input style="display: none;" type="time">

      //         <textarea  style="font-size: 0.8rem; display: none;" class="form-control" placeholder="Type your message here..." id="scMessage" required></textarea>
      // <button  style="display: none;" id="sButton2">Done</button>

      document
        .getElementById("contactUs")
        .addEventListener("click", function (params) {
          fbqEventCatcher("Contact");
          let phonenum = "919818215182";
          let message = "Hi, I've just started using whatzapp & i have a query";
          chrome.storage.sync.set({ message: message });

          chrome.storage.sync.set({ phone: phonenum });
          console.log(isSignup);
          console.log(isExpired);
          validityChecker();
          if (isSignup && !isExpired) {
            chrome.runtime.sendMessage({ manageMischief: true });
          }
        });

      document.getElementById("filterIcon").src =
        chrome.runtime.getURL("filter.svg");

      document.getElementById("filterIcon2").src =
        chrome.runtime.getURL("filter.svg");

      document
        .getElementById("filterLevelInput")
        .addEventListener("change", function (params) {
          console.log(this.value);
          searchTheResult(filterTagArr, this.value);
        });
      document
        .getElementById("filterLevelInput2")
        .addEventListener("change", function (params) {
          searchTheResultPendingFollowUp(filterTagPendingArr, this.value);
        });

      document
        .getElementById("filterIcon")
        .addEventListener("click", function (params) {
          var listObject = document.getElementById("taglistcheckbox");

          var count = 0;
          for (
            var i = 0;
            i < listObject.getElementsByTagName("input").length;
            i++
          ) {
            if (listObject.getElementsByTagName("input")[i].checked) {
              count++;
              filterTagArr.push(
                listObject.getElementsByTagName("label")[i].innerHTML
              );
            }
          }
          if (count > 0) {
            if (count > 1)
              document.getElementById("filterTagsInput").placeholder =
                count + " Labels Applied";
            else
              document.getElementById("filterTagsInput").placeholder =
                count + " Labels Applied";
          } else document.getElementById("filterTagsInput").placeholder = "Labels";

          searchTheResult(
            filterTagArr,
            document.getElementById("filterLevelInput").value
          );
          document.getElementsByClassName("removefilter")[0].style.display =
            "block";
        });
      document
        .getElementsByClassName("removefilter")[0]
        .addEventListener("click", function (params) {
          filteredTagsarr = [];
          filterTagArr = [];
          getCustomerList(customerListArray);

          for (
            var i = 0;
            i <
            document
              .getElementById("taglistcheckbox")
              .getElementsByTagName("input").length;
            i++
          ) {
            if (
              document
                .getElementById("taglistcheckbox")
                .getElementsByTagName("input")[i].checked == true
            )
              document
                .getElementById("taglistcheckbox")
                .getElementsByTagName("input")[i].checked = false;
          }

          document.getElementById("filterTagsInput").placeholder = "Labels";
          document.getElementById("filterLevelInput").value = "";
          this.style.display = "none";
        });

      document
        .getElementById("filterIcon2")
        .addEventListener("click", function (params) {
          var listObject = document.getElementById("taglistcheckbox2");

          var count = 0;
          for (
            var i = 0;
            i < listObject.getElementsByTagName("input").length;
            i++
          ) {
            if (listObject.getElementsByTagName("input")[i].checked) {
              count++;
              filterTagPendingArr.push(
                listObject.getElementsByTagName("label")[i].innerHTML
              );
            }
          }

          if (count > 0) {
            if (count > 1)
              document.getElementById("filterTagsInput2").placeholder =
                count + " Labels Applied";
            else
              document.getElementById("filterTagsInput2").placeholder =
                count + " Label Applied";
          } else document.getElementById("filterTagsInput2").placeholder = "Labels";
          searchTheResultPendingFollowUp(
            filterTagPendingArr,
            document.getElementById("filterLevelInput2").value
          );
          document.getElementsByClassName("removefilter")[1].style.display =
            "block";
        });
      document
        .getElementsByClassName("removefilter")[1]
        .addEventListener("click", function (params) {
          filteredTagPendingArr = [];
          filterTagPendingArr = [];
          getFollowUpPendingList(customerFollowupList);

          for (
            var i = 0;
            i <
            document
              .getElementById("taglistcheckbox2")
              .getElementsByTagName("input").length;
            i++
          ) {
            if (
              document
                .getElementById("taglistcheckbox2")
                .getElementsByTagName("input")[i].checked == true
            )
              document
                .getElementById("taglistcheckbox2")
                .getElementsByTagName("input")[i].checked = false;
          }

          document.getElementById("filterTagsInput2").placeholder = "Labels";
          document.getElementById("filterLevelInput2").value = "";
          this.style.display = "none";
        });

      document
        .getElementById("searchinput")
        .addEventListener("input", function (params) {
          setTimeout(() => {
            searchTheResultBasisName(this.value);
          }, 500);
        });

      document
        .getElementById("searchinput2")
        .addEventListener("input", function (params) {
          setTimeout(() => {
            searchTheResultPendingFollowUpNameBasis(this.value);
          }, 500);
        });
    });

  // fb events

  var fbScript = document.createElement("script");
  fbScript.src = "https://connect.facebook.net/en_US/fbevents.js";

  var fbpixImg = document.createElement("noscript");
  var imgFb = document.createElement("img");
  imgFb.height = 1;
  imgFb.width = 1;
  imgFb.style.display = "none";
  imgFb.src =
    "https://www.facebook.com/tr?id=577091703261048&ev=PageView&noscript=1";
  fbpixImg.append(imgFb);

  document.getElementsByTagName("head")[0].append(fbpixImg);

  //appending html and css into the dom ...

  return "succes";
  //javascript for changing css dynamically

  //javascript for uploading excel sheet
}

var intervalID2 = setInterval(async function () {
  var data = setLayout();

  if (data !== null) {
    window.clearInterval(intervalID2);
  }
}, 500);

var intervalID3 = setInterval(async function () {
  setMediaLayout();

  if (!isChanged) {
    window.clearInterval(intervalID3);
  }
}, 1000);

var intervalId4 = setInterval(async function () {
  var data = setImage();
  if (data !== null) {
    window.clearInterval(intervalId4);
  }
}, 500);

// var IntervalId5 = setInterval(async function () {}, 800);

//sending schedules message when present time matches scheduled time

function sendScheduledMessage(chat_id, message) {
  console.log(message, chat_id);

  // console.log(isSignup);
  // console.log(isExpired);
  validityChecker();

  postTheCustomerSchedule(chat_id, 1);
  customerScheduleArr.forEach((element) => {
    if (element.chat_id == chat_id) {
      element.status = 1;
    }
  });
  window.postMessage(
    {
      id: chat_id,
      text: message,
      cmd: "sendMessage",
      direction: "from-content-script",
    },
    "*"
  );
  console.log("user id ", active_chat_id);
  if (active_chat_id == chat_id) {
    setTimeout(() => {
      console.log("calling customer info to remove");
      customerInfoFinder();
    }, 1000);
  }
}

//function to post the customer schedule and get the latest set array of scheduled messagees

function postTheCustomerSchedule(chat_id, statusVal) {
  var no_user = BigInt(phoneString);

  fetch(
    "https://eazybe.com/api/v1/whatzapp/customerSchedule?" +
      new URLSearchParams({
        user_mobile_No: no_user,
        chat_id: chat_id,
      }),

    {
      method: "POST",

      body: JSON.stringify({
        status: statusVal,
      }),

      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
    }
  )
    .then((response) => response.json())

    .then((json) => {
      console.log(json);
    });
}
//function to getTheChatId

// function getChatId(params) {
//   if (document.getElementsByClassName("focusable-list-item")[1]) {
//     var data_id = document.getElementsByClassName("focusable-list-item")[1]
//       .dataset.id;
//     data_id = String(data_id);
//     var userId;
//     var i = 0;
//     var j;
//     var lastIndex;
//     console.log(data_id);
//     for (i = 0; i < data_id.length; i++) {
//       if (data_id.charAt(i) == "_") {
//         for (j = i + 1; j < data_id.length; j++) {
//           if (data_id.charAt(j) == "_") {
//             lastIndex = j;
//             break;
//           }
//         }
//         break;
//       }
//     }
//     userId = data_id.substring(i + 1, lastIndex);

//     return userId;
//   } else {
//     return "addnewUserCase";
//   }
// }
//function to fill info of the scheduled section

function fillDefaultScheduleSection() {
  var date = new Date();

  var day = date.getDate(),
    month = date.getMonth() + 1,
    year = date.getFullYear(),
    hour = date.getHours(),
    min = date.getMinutes();

  month = (month < 10 ? "0" : "") + month;

  hour = (hour < 10 ? "0" : "") + hour;
  min = (min < 10 ? "0" : "") + min;

  var today = year + "-" + month + "-" + day,
    displayTime = hour + ":" + min;

  document.getElementById("selectTime").value = displayTime;
  document.getElementById("scheduletext").value = "";
  document.getElementById("customRecurrence").checked = false;
  document.getElementById("repeatTime").getElementsByTagName("input")[0].value =
    "";
  document.getElementById("repeatTime").style.visibility = "hidden";
  window.postMessage(
    {
      month: month - 1,
      year: year,
      day: day,
      cmd: "generateCalendar",
      direction: "from-content-script",
    },
    "*"
  );
}

function fillInfoOfScheduleSection(element) {
  document.getElementById("scheduletext").value = element.message;

  document.getElementById("selectTime").value = element.time.substring(11, 16);
  ///2022-05-10
  const year = element.time.substring(0, 4);
  const month = parseInt(element.time.substring(5, 7)) - 1;
  const day = parseInt(element.time.substring(8, 10));
  if (element.custom_repeat) {
    document.getElementById("customRecurrence").checked = true;
    document.getElementById("repeatTime").style.visibility = "inherit";
    if (element.custom_repeat >= 60 && element.custom_repeat < 1440) {
      document
        .getElementById("repeatTime")
        .getElementsByTagName("input")[0].value = element.custom_repeat / 60;
      document
        .getElementById("repeatTime")
        .getElementsByTagName("select")[0].value = "Hour";
    } else if (element.custom_repeat >= 1440 && element.custom_repeat < 43800) {
      document
        .getElementById("repeatTime")
        .getElementsByTagName("input")[0].value = element.custom_repeat / 1440;
      document
        .getElementById("repeatTime")
        .getElementsByTagName("select")[0].value = "Day";
    } else if (element.custom_repeat >= 43800) {
      document
        .getElementById("repeatTime")
        .getElementsByTagName("input")[0].value = element.custom_repeat / 43800;
      document
        .getElementById("repeatTime")
        .getElementsByTagName("select")[0].value = "Month";
    } else {
      document
        .getElementById("repeatTime")
        .getElementsByTagName("input")[0].value = element.custom_repeat;
      document
        .getElementById("repeatTime")
        .getElementsByTagName("select")[0].value = "Minute";
    }
  }
  window.postMessage(
    {
      month: month,
      year: year,
      day: day,
      cmd: "generateCalendar",
      direction: "from-content-script",
    },
    "*"
  );
}

function getInMinutes(params) {
  var count = document
    .getElementById("repeatTime")
    .getElementsByTagName("input")[0].value;
  var timeSpan = document
    .getElementById("repeatTime")
    .getElementsByTagName("select")[0].value;
  var totalMinutes;
  if (timeSpan == "Day") {
    totalMinutes = count * 1440;
  } else if (timeSpan == "Hour") {
    totalMinutes = count * 60;
  } else if (timeSpan == "Minute") {
    totalMinutes = count;
  } else if (timeSpan == "Month") {
    totalMinutes = count * 43800;
  }

  return totalMinutes;
}

//function to getTheappending message
function getScheduledObject(messageText, dateTime, status) {
  var box = document.createElement("div");
  box.classList.add("_2wUmf", "message-out", "scheduled-message", "_EPCuyz9S");
  box.innerHTML =
    "<div class='jss5983'><div  class='jss5987'><div role='button'><svg style='font-size:1.2em' class='MuiSvgIcon-root MuiSvgIcon-fontSizeInherit' focusable='false' viewBox='0 0 24 24' aria-hidden='true'><path d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'></path></svg></div><div></div><div role='button'  class='jss5988'><div></div><div><svg style='font-size:1.2em' class='MuiSvgIcon-root MuiSvgIcon-fontSizeInherit' focusable='false' viewBox='0 0 24 24' aria-hidden='true'><path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'></path></svg></div></div></div><div class='_1OBJBHT_UEAhW9_x2Nylnj'><div></div></div><div class='jss5985 scMessageInfo'>sd</div><div dir='auto' class='jss5986 scTimeInfo'></div></div>";
  box.getElementsByClassName("scMessageInfo")[0].innerText = messageText;
  box.getElementsByClassName("scTimeInfo")[0].innerText = dateTime;
  if (status == -1) {
    var alertBox = document.createElement("div");
    alertBox.innerHTML =
      "<div><div class='' title='A message was scheduled but not sent because WhatsApp web was closed' style='direction: ltr;'><svg class='MuiSvgIcon-root MuiSvgIcon-fontSizeInherit' focusable='false' viewBox='0 0 24 24' aria-hidden='true' style='fill: red;font-size:1.2em;color: rgb(255, 152, 0);'><path d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'></path></svg></div></div>";
    box
      .getElementsByClassName("jss5987")[0]
      .insertBefore(
        alertBox,
        box.getElementsByClassName("jss5987")[0].firstChild.nextSibling
      );
  }
  box
    .getElementsByClassName("scMessageInfo")[0]
    .addEventListener("click", function (params) {
      document.getElementById("scheduleSectionFull").style.display = "block";
      document.getElementsByClassName("scheduleOverlay")[0].style.display =
        "block";
    });
  box
    .getElementsByClassName("jss5987")[0]
    .getElementsByTagName("div")[0]
    .addEventListener("click", function (params) {
      document.getElementById("scheduleSectionFull").style.display = "block";
      document.getElementsByClassName("scheduleOverlay")[0].style.display =
        "block";
    });
  box
    .getElementsByClassName("jss5988")[0]
    .addEventListener("click", function (params) {
      var chat_id = active_chat_id;

      const no_user = BigInt(phoneString);
      box.style.display = "none";
      fetch(
        "https://eazybe.com/api/v1/whatzapp/deleteCustomerSchedule?" +
          new URLSearchParams({
            user_mobile_No: no_user,
            chat_id: chat_id,
          })
      )
        .then((resp) => resp.json())
        .then(function (response) {
          console.log(response.data);
          fetch(
            "https://eazybe.com/api/v1/whatzapp/getCustomerSchedule?" +
              new URLSearchParams({
                user_mobile_No: no_user,
              })
          )
            .then((resp) => resp.json())
            .then(function (response) {
              var object1 = response.data;
              console.log(object1);
              customerScheduleArr = object1;
            })
            .catch(function (error) {
              console.log(error);
            });
        })
        .catch(function (error) {
          console.log(error);
        });
    });
  console.log(box);
  return box;
}

//function to set Event Listners of the schedule section popup
function setEventListenerOfSc(params) {
  document
    .getElementById("scheduleSend")
    .addEventListener("click", function (params) {
      console.log("hello");

      var dateTime;
      var messageText = document.getElementById("scheduletext").value;
      var day = document.getElementById("selectedDay").innerText;
      var month = document.getElementById("month-picker").innerText;
      var year = document.getElementById("year").innerText;
      var time = document.getElementById("selectTime").value;

      var timeSplit = time.split(":"),
        hours,
        minutes,
        meridian;
      hours = timeSplit[0];
      minutes = timeSplit[1];
      if (hours > 12) {
        meridian = "PM";
        hours -= 12;
      } else if (hours < 12) {
        meridian = "AM";
        if (hours == 0) {
          hours = 12;
        }
      } else {
        meridian = "PM";
      }
      time = hours + ":" + minutes + " " + meridian;
      var StandardTime = convertTime12to24(time);

      console.log("scheduelsend", messageText, day, month, year, time);
      var months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "Decemeber",
      ];

      var monthValue;
      for (var i = 0; i < months.length; i++) {
        if (months[i] == month) {
          if (i + 1 < 10) {
            monthValue = "0" + String(i + 1);
          } else {
            monthValue = String(i + 1);
          }
          break;
        }
      }

      if (day.length < 2) {
        day = "0" + day;
      }

      dateTime =
        year + "-" + monthValue + "-" + day + " " + StandardTime + ":00";
      console.log(dateTime);

      var chat_id = active_chat_id;

      customer_no = chat_id.substring(0, chat_id.length - 5);
      if (customer_no.length > 12) {
        customer_no = customer_no.substring(0, 10);
      }
      console.log(customer_no);
      const no_user = BigInt(phoneString);

      const no_customer = BigInt(customer_no);
      const infoName =
        document.getElementsByClassName("contactDisplayName")[0].innerText;
      var mainObject = document.getElementById("main");
      var headerFlex = mainObject.getElementsByTagName("header")[0];
      var img_src;
      if (headerFlex.getElementsByTagName("img")[0])
        img_src = headerFlex.getElementsByTagName("img")[0].src;
      else img_src = document.getElementById("demouser").src;

      let repeatTime;

      if (document.getElementById("customRecurrence").checked == true)
        repeatTime = getInMinutes();
      else repeatTime = null;
      console.log("repeat tome", repeatTime);
      fetch(
        "https://eazybe.com/api/v1/whatzapp/customerSchedule?" +
          new URLSearchParams({
            user_mobile_No: no_user,
            mobile: no_customer,
            chat_id: chat_id,
          }),

        {
          method: "POST",

          body: JSON.stringify({
            name: infoName,
            img_src: img_src,
            dateTime: dateTime,
            message: messageText,
            repeatTime: repeatTime,
            status: 0,
          }),

          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
        }
      )
        .then((response) => response.json())

        .then((json) => {
          console.log(json);
          fetch(
            "https://eazybe.com/api/v1/whatzapp/getCustomerSchedule?" +
              new URLSearchParams({
                user_mobile_No: no_user,
              })
          )
            .then((resp) => resp.json())
            .then(function (response) {
              var object1 = response.data;
              console.log(object1);
              customerScheduleArr = object1;
            })
            .catch(function (error) {
              console.log(error);
            });
        });

      document.getElementById("scheduleSectionFull").style.display = "none";
      document.getElementsByClassName("scheduleOverlay")[0].style.display =
        "none";

      if (document.getElementsByClassName("scheduled-message")[0]) {
        document.getElementsByClassName("scheduled-message")[0].style.display =
          "none";
      }

      var scheduledObject = getScheduledObject(messageText, dateTime, 0);
      document.getElementsByClassName("y8WcF")[0].append(scheduledObject);

      var myElement = document.getElementsByClassName("scheduled-message")[0];
      var topPos = myElement.offsetTop;
      console.log(topPos);
      document
        .getElementById("main")
        .getElementsByClassName("_33LGR")[0].style.overflowY = "scroll";
      document
        .getElementById("main")
        .getElementsByClassName("_33LGR")[0].scrollTop = 1770;
    });

  document
    .getElementById("cancelSchedule")
    .addEventListener("click", function (params) {
      document.getElementById("scheduleSectionFull").style.display = "none";
      document.getElementsByClassName("scheduleOverlay")[0].style.display =
        "none";
    });

  document
    .getElementById("customRecurrence")
    .addEventListener("change", function (params) {
      var repeatSection = document.getElementById("repeatTime");
      if (repeatSection.style.visibility == "inherit") {
        repeatSection.style.visibility = "hidden";
      } else {
        repeatSection.style.visibility = "inherit";
      }
    });
}
// function to set the layout of date functionaltiy

function scheduleSectionPopup() {
  var scheduleSectionFull = document.createElement("div");
  var timePicker = document.createElement("div");
  scheduleSectionFull.style.zIndex = 1000220;
  var calenderdiv = document.createElement("div");
  var calenderstyle = document.createElement("link");
  var calenderscript = document.createElement("script");
  calenderstyle.setAttribute("rel", "stylesheet");

  scheduleSectionFull.setAttribute("id", "scheduleSectionFull");
  calenderdiv.setAttribute("id", "calender-wrapper");
  fetch(chrome.runtime.getURL("/datetime.html"))
    .then((r) => r.text())
    .then((html) => {
      calenderdiv.insertAdjacentHTML("beforeend", html);
      console.log(calenderdiv);
      calenderstyle.href = chrome.runtime.getURL("assets/css/datetime.css");

      calenderscript.src = chrome.runtime.getURL("assets/js/datetime.js");
      document
        .getElementsByTagName("head")[0]
        .append(calenderstyle, calenderscript);

      scheduleSectionFull.append(calenderdiv);
      document.getElementById("app").append(scheduleSectionFull);
      setEventListenerOfSc();
    });
}

// function to comapare the schedule time and present time

function getDateTime() {
  var dateTime = new Date(
    new Date().toString().split("GMT")[0] + " UTC"
  ).toISOString();
  var dateTime2 = new Date(
    new Date().toString().split("GMT")[0] + " UTC"
  ).toISOString();

  let phoneNumsObject = [];
  console.log(dateTime);
  console.log(dateTime.substring(0, dateTime.length - 7));
  dateTime = dateTime.substring(0, dateTime.length - 7) + "00.000Z";
  console.log(dateTime);
  customerScheduleArr.forEach((element) => {
    if (element.time == dateTime) {
      phoneNumsObject.push(element.chat_id, element.message);
      element.status = 1;
    }

    if (element.time < dateTime2) {
      if (element.status != 1) {
        element.status = -1;
        postTheCustomerSchedule(element.chat_id, -1);
        console.log("user id ", active_chat_id);
        if (active_chat_id == element.chat_id) {
          setTimeout(() => {
            customerInfoFinder();
          }, 1000);
        }
      }
    }

    // console.log(element.time, dateTime2);
  });
  console.log(phoneNumsObject);

  if (phoneNumsObject.length == 2) {
    sendScheduledMessage(phoneNumsObject[0], phoneNumsObject[1]);
  }

  if (phoneNumsObject.length > 2) {
    var i = 0;

    var interValID6 = setInterval(() => {
      sendScheduledMessage(phoneNumsObject[i], phoneNumsObject[i + 1]);
      i += 2;
      if (i == phoneNumsObject.length) {
        window.clearInterval(interValID6);
      }
    }, 10000);
  }

  return dateTime;
}

// example usage: realtime clock
setInterval(function () {
  getDateTime();
}, 60000);

function checkUpdate() {
  fetch("https://eazybe.com/api/v1/whatzapp/getUpdatedVersion")
    .then((resp) => resp.json())
    .then(function (response) {
      if (response.data != version) {
        document.getElementById("updatePopup").style.display = "block";
        document.getElementsByClassName("scheduleOverlay")[0].style.display =
          "block";
      }
    })
    .catch(function (error) {
      console.log(error);
    });
}

setInterval(() => {
  checkUpdate();
}, 3000);

//google analytics
function settingUpgoogleanalytics(params) {
  (function () {
    var ga = document.createElement("script");
    ga.type = "text/javascript";
    ga.async = true;
    ga.src = "https://ssl.google-analytics.com/ga.js";
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(ga, s);
  })();

  setTimeout(() => {
    var _gaq = _gaq || [];
    console.log("setting account of google analytics");
    _gaq.push(["_setAccount", "G-2ZL95KH1BK"]);
    _gaq.push(["_trackPageview"]);
  }, 2000);
}
settingUpgoogleanalytics();

function addingGoogleAnalytics() {
  var gtagscript = document.createElement("script");
  var gfunctionscript = document.createElement("script");
  gtagscript.async = true;
  gtagscript.src = "https://www.googletagmanager.com/gtag/js?id=G-7E6GKKYRJT";

  document.getElementsByTagName("head")[0].append(gtagscript);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    console.log("hello");
    console.log(arguments);
    dataLayer.push(arguments);
  }
  gtag("js", new Date());

  gtag("config", "G-7E6GKKYRJT");
  console.log("Pageview sent");
  gtag("event", "sign_up", {
    event_category: "engagement",
    event_label: "method",
  });
}

// addingGoogleAnalytics();
//hans work
// function getTheHansLeads(params) {
//   var mobileNo = "+" + phoneString;
//   fetch(
//     "https://partner.hansmatrimony.com/api/leadsdetailsbyphone?" +
//       new URLSearchParams({
//         mobile: mobileNo,
//       })
//   )
//     .then((resp) => resp.json())
//     .then(function (response) {
//       console.log(response);
//     })
//     .catch(function (error) {
//       console.log(error);
//     });
// }

// function postTheDataToHansimg(img_src) {
//   var customer_no = active_chat_id.substring(
//     active_chat_id.length - 5,
//     active_chat_id.length
//   );

//   fetch("https://partner.hansmatrimony.com/api/updatewhatsappdata", {
//     method: "POST",

//     body: JSON.stringify({
//       mobile_no: customer_no,
//       profile_pic: img_src,
//       profile_data: null,
//     }),

//     headers: {
//       "Content-type": "application/json; charset=UTF-8",
//     },
//   })
//     .then((response) => response.json())
//     .then((json) => {
//       console.log(json);
//     });
// }
// function postTheDataToHanstext(textinfo) {
//   var customer_no = active_chat_id.substring(
//     active_chat_id.length - 5,
//     active_chat_id.length
//   );
//   console.log(customer_no);
//   fetch("https://partner.hansmatrimony.com/api/updatewhatsappdata", {
//     method: "POST",

//     body: JSON.stringify({
//       mobile_no: customer_no,
//       profile_pic: null,
//       profile_data: textinfo,
//     }),

//     headers: {
//       "Content-type": "application/json; charset=UTF-8",
//     },
//   })
//     .then((response) => response.json())

//     .then((json) => {
//       console.log(json);
//     });
// }

// var uploadButtonURl = chrome.runtime.getURL("upload.svg");
// function getElementByXpath(path) {
//   return document.evaluate(
//     path,
//     document,
//     null,
//     XPathResult.FIRST_ORDERED_NODE_TYPE,
//     null
//   ).singleNodeValue;
// }
// function settingHover() {
//   var hoverSection = document.getElementsByClassName("y8WcF")[0];

//   var arr = [];
//   arr = hoverSection.childNodes;

//   var brr = [].slice.call(arr);
//   brr.forEach((element) => {
//     // console.log(element.classList);
//     var classLists = [].slice.call(element.classList);

//     if (!classLists.includes("exportingReady")) {
//       if (!element.getElementsByClassName("exportButton")[0]) {
//         element.classList.add("exportingReady");
//         if (classLists.includes("message-in")) {
//           element.style = "flex-direction:row;";

//           var exportButton = document.createElement("div");
//           var buttonObject = document.createElement("img");
//           buttonObject.setAttribute("role", "button");
//           buttonObject.classList.add("exportButton");
//           exportButton.setAttribute("class", "exportData");
//           exportButton.append(buttonObject);
//           buttonObject.src = uploadButtonURl;

//           element.append(exportButton);
//           exportButton.addEventListener("click", function (params) {
//             if (element.getElementsByClassName("copyable-text")[0]) {
//               var textInfo =
//                 element.getElementsByClassName("copyable-text")[0].innerText;
//               console.log(textInfo);
//               postTheDataToHanstext(textInfo);
//             } else {
//               var img_srcForhans = getElementByXpath(
//                 "/html/body/div[1]/div[1]/div[1]/div[4]/div[1]/div[4]/div/div/div[3]/div[20]/div[1]/div[1]/div/div/div[2]/div[1]/div[2]/img"
//               ).src;
//               //*[@id="main"]/div[4]/div/div/div[3]/div[20]/div[1]/div[1]/div/div/div[1]

//               console.log(img_srcForhans);
//               postTheDataToHansimg(img_srcForhans);
//             }
//           });
//         } else if (classLists.includes("message-out")) {
//           element.style =
//             "flex-direction: row-reverse; justify-content: flex-start; align-items: flex-start;";

//           var exportButton = document.createElement("div");
//           var buttonObject = document.createElement("img");
//           buttonObject.setAttribute("role", "button");
//           buttonObject.classList.add("exportButton");
//           exportButton.setAttribute("class", "exportData");
//           exportButton.append(buttonObject);
//           buttonObject.src = uploadButtonURl;

//           element.append(exportButton);
//           exportButton.addEventListener("click", function (params) {
//             if (element.getElementsByClassName("copyable-text")[0]) {
//               var textInfo =
//                 element.getElementsByClassName("copyable-text")[0].innerText;
//               console.log(textInfo);
//               postTheDataToHanstext(textInfo);
//             } else if (element.getElementsByClassName("_2p30Q")[0]) {
//               var img_srcForhans = element
//                 .getElementsByClassName("_2p30Q")[0]
//                 .getElementsByTagName("img")[0].src;
//               console.log(img_srcForhans);
//               postTheDataToHansimg(img_srcForhans);
//             }
//           });
//         }
//       }
//     }
//   });
// }
// setInterval(() => {
//   settingHover();
// }, 5000);



// global varible of Show_Selected button
function setTheJavascriptincampainPage()
{
  
  console.log("setTheJavascriptincampainPage");
  	// global varible of Show_Selected button
    var Show=false;

		// selected user list
    var  user_List=[];
    // All contacts List;
    var AllContacts;

    window.addEventListener("message", function (event) {
      if ( event.source == window && event.data &&  event.data.direction == "from-page-script" )
      {
        if(event.data.res="AllContacts")
        {
          // console.log(event.data.AllContacts);
          
          AllContacts=event.data.AllContacts;
          setuptable_(AllContacts);
          document.getElementById("total_contacts").innerHTML=AllContacts.length;

        }
      }
    })

    
    window.postMessage(
      {
        cmd: "getAllContacts",
        direction: "from-content-script",
      },
      "*"
    );
    // fetching the list data 
    console.log(phoneString);
    fetch(`https://eazybe.com/api/v1/whatzapp/getCampaignInfo?userMobile=${phoneString}`)
    .then((response) => response.json())
    .then((json) => {
      console.log(json);
      set_contacts_lists(json.campaignDetails.chatID_list);
      
    });
    // setting up the fetched list  name and contacts detail
    function set_contacts_lists(contacts_list)
    {   
        console.log(contacts_list);
        // contacts_list.map((element)=>
        // {
          
        //   // console.log(element);
        // })
        Object.entries(contacts_list).map(entry => {
          let key = entry[0];
          let value = entry[1];
          console.log( document.getElementById("list_drop_down"));
          p=document.createElement("p");
          p.innerHTML=key;
          p.id="list_drop-down_p"
          p.style="text-align: start;font-size: 21px;font-family:Montserrat  Alternates;margin-left: 18px;"
          // p.style="text-align: start;padding-top: 10px;font-size: 21px;font-family: "Montserrat Alternates";padding-left: 18px;height: 45px;"
          document.getElementById("list_drop_down").append(p);
          console.log(key, value);
      });
        for(var i=0;i<contacts_list.length;i++)
        {
          console.log(contacts_list[i]);
          entry=contacts_list[i];
          let key = entry[0];
          let value = entry[1];
          console.log(key, value);
        }
    }

    function setuptable_()
    {
      document.getElementById("Selected_contacts").innerHTML=0;
      console.log(table =document.getElementById("table_body"));
      console.log(AllContacts);
      for(var i=0;i<AllContacts.length;i++)
      {
        // console.log(AllContacts[i].id);

        // console.log(AllContacts[i].id.user);
        table_row=document.createElement("tr");
        table_row.id=AllContacts[i].id._serialized;
        table_row.style="background: white; display: table-row;"
        table_row.value=AllContacts[i].name;
        td1=document.createElement("td");
        td1.innerHTML=AllContacts[i].name;

        td2=document.createElement("td");
        td2.innerHTML=AllContacts[i].pushname;

        td3=document.createElement("td");
        td3.innerHTML=AllContacts[i].user;

        td4=document.createElement("td");
        td4.innerHTML=AllContacts[i].name;
        table_row.append(td1,td2,td3,td4)
        // console.log(table_row);
        document.getElementById("table_body").append(table_row);
      }
    
      console.log(document.getElementById("table_body"));


      row=document.getElementsByTagName("tr");
      // console.log(row);
      for(let i=1;i<row.length;i++)
      {
        // console.log(row[i],"is clicked");
        row[i].addEventListener("click",function()
        {
          console.log(row[i]);
          clicked(row[i]);
  
        });
        
      }
      
    }

    //  create new List 
    document.getElementById("create_new_list").addEventListener("click",function()
    {
      var name=document.getElementById("input_list_name").value;
      
      
    })

    document.getElementById("send_btn").addEventListener("click",function()
    {
      // if (message.value != "" && user_List.length>0) {
    

      console.log(user_List);
      message="There??";
        broadcastMessages(user_List, message);
    // }
    
  });


			var table=document.getElementById("contact_table");
				var row=table.getElementsByTagName("tr");
        // console.log(table);
        // console.log(row);			

      document.getElementById("total_contacts").innerHTML=row.length-1;

			function remove_file()
			{
				console.log("file is removed");
				console.log(document.getElementById("myfile").repalceWith(" "));
			}
	


  //  change to list page 
  document.getElementById("List").addEventListener("click",function()
  {
		document.getElementById('List__').style.display="block";
		document.getElementById('Template__').style.display="none";
		document.getElementById('Campains__').style.display="none";
  });    
	
  //  chageToTemplatePage >

  document.getElementById("Template").addEventListener("click",function()
  {
    document.getElementById('Campains__').style.display="none";
    	document.getElementById('Template__').style.display="block";
    	document.getElementById('List__').style.display="none";
  });
	
  //  change yo Campains page

  document.getElementById("Campains").addEventListener("click",function()
  {

    document.getElementById('Campains__').style.display="block";
		document.getElementById('Template__').style.display="none";
		document.getElementById('List__').style.display="none";
  });
	
  //  campain cross button
  document.getElementById("campain-cancel-button").addEventListener("click",function()
  {
    console.log("campain croos button is clicked");
    document.getElementById("campain").style.display="none";
    document.getElementsByClassName("scheduleOverlay")[0].style.display ="none";


  });

		//  funtion of implement show selected button
    document.getElementById("flexSwitchCheckChecked").addEventListener("click",function()
    {
      console.log("flexSwitchCheckChecked is trigered");
      Show_Selected();
    })

		function Show_Selected()
		{
			Show=!Show;
			if(Show==true)
			{
        // document.getElementById("table-body");
        // console.log(document.getElementById("table-body"));
        // console.log(document.getElementById("table_body"));
        // document.getElementById("table_body").innerHTML="";
        
				console.log("Show_Selected is trigered",Show);
				var table=document.getElementById("contact_table");
				var row=table.getElementsByTagName("tr");
				for (i=1; i < row.length; i++) {
	    			const index=user_List.findIndex((element)=> element==row[i].id);
	    			if(index<0)
	    			{
						document.getElementById(row[i].id).style.display="none";
	    			}


					}				
			}
			else
			{
				
				var table=document.getElementById("contact_table");
				var row=table.getElementsByTagName("tr");
				console.log(row);
				for(i=1;i<row.length;i++)
				{
						document.getElementById(row[i].id).style.display="table-row";				
				}
			}


		}

    console.log(document.getElementById("myInput"));
    document.getElementById("myInput").addEventListener("keydown" ,function()
    {
      myFunction();
    })

		// funtion to implement a search 

		function myFunction() {
		  // console.log("vibhu");
		  var input, filter, table, tr, td, i, txtValue;
		  input = document.getElementById("myInput");
		  filter = input.value.toUpperCase();
		  table = document.getElementById("contact_table");
		  tr = table.getElementsByTagName("tr");
		  for (i = 0; i < tr.length; i++) {
		    td = tr[i].getElementsByTagName("td")[0];
		    if (td) {
		      txtValue = td.textContent || td.innerText;
		      if (txtValue.toUpperCase().indexOf(filter) > -1) {
		        tr[i].style.display = "";
		      } else {
		        tr[i].style.display = "none";
		      }
		    }       
		  }
		}

		// funtion to implement onclick funtion on row
  
   

		function clicked( event)
		{
      console.log(event);
			// console.log(event,document.getElementById(event).style.background)
			if((event).style.background=="skyblue")
			{
				(event).style.background="white";
				const index=user_List.findIndex((element)=> element==event.id)
				user_List.splice(index,1);
				console.log(event.id._serialized,"unselected");
        document.getElementById("Selected_contacts").innerHTML=user_List.length;
			}
			else
			{
				(event).style.background="skyblue";
				user_List.push(event.id);
				console.log(event.id,"selected");
        document.getElementById("Selected_contacts").innerHTML=user_List.length;

      }

			console.log(user_List);
				
		}


}
