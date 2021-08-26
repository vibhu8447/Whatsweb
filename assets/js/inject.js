startTimer = async () => {
  setTimeout(inject, 200);
};
eventFire = async (MyElement, ElementType) => {
  let MyEvent = document.createEvent("MouseEvents");
  MyEvent.initMouseEvent(
    ElementType,
    true,
    true,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null
  );
  MyElement.dispatchEvent(MyEvent);
};

openChat = async (phone) => {
  console.log("phoen in open chat", phone);
  var link = document.createElement("a");
  link.setAttribute("href", `whatsapp://send?phone=${phone}`);
  document.body.append(link);
  link.click();
  document.body.removeChild(link);
};
console.log("is this even gettign read");

inject = async () => {
  console.log("inject stuff");
  let resolvephoneNums = new Promise(function (resolve, reject) {
    chrome.storage.sync.get({ phoneNums: true }, function (options) {
      resolve(options.phoneNums);
    });
  });
  let phoneNums = await resolvephoneNums;
  console.log(phoneNums);
  if (phoneNums.length > 0) {
    var x = 0;
    var intervalID = setInterval(async function () {
      openChat(phoneNums[x]);
      setTimeout(async function () {
        let messageBox = document.querySelectorAll(
          "[contenteditable='true']"
        )[1];

        let resolveCount = new Promise(function (resolve, reject) {
          chrome.storage.sync.get({ count: true }, function (options) {
            resolve(options.count);
          });
        });
        let resolveMessage = new Promise(function (resolve, reject) {
          chrome.storage.sync.get({ message: true }, function (options) {
            resolve(options.message);
          });
        });

        let counter = await resolveCount;
        let message = await resolveMessage;
        for (i = 0; i < counter; i++) {
          event = document.createEvent("UIEvents");
          messageBox.innerHTML = message;
          event.initUIEvent("input", true, true, window, 1);
          messageBox.dispatchEvent(event);
          if (message && counter) {
            eventFire(
              document.querySelector('span[data-icon="send"]'),
              "click"
            );
          }
        }

        if (++x === phoneNums.length) {
          isRunning = false;
          window.clearInterval(intervalID);
        }
      }, 2000);
    }, 3000);
  } else {
    let resolvePhone = new Promise(function (resolve, reject) {
      chrome.storage.sync.get({ phone: true }, function (options) {
        resolve(options.phone);
      });
    });
    let phone = await resolvePhone;
    openChat(phone);
    setTimeout(() => {
      findnumber();
      let messageBox = document.querySelectorAll("[contenteditable='true']")[1];
      let counter = 1,
        message;
      console.log("Calling");
      isRunning = false;
      customerInfoFinder();
      // let resolveCount = new Promise(function(resolve, reject){
      // chrome.storage.sync.get({"count": true}, function(options){ counter=options.count })
      // });
      // let resolveMessage = new Promise(function(resolve, reject){
      chrome.storage.sync.get({ message: true }, function (options) {
        console.log(options.message);
        message = options.message;
      });
      // });

      // let counter = await resolveCount; let message = await resolveMessage;
      setTimeout(() => {
        console.log(counter, message);
        for (i = 0; i < counter; i++) {
          event = document.createEvent("UIEvents");
          messageBox.innerHTML = message;
          event.initUIEvent("input", true, true, window, 1);
          messageBox.dispatchEvent(event);
          if (message && counter) {
            eventFire(
              document.querySelector('span[data-icon="send"]'),
              "click"
            );
          }
        }
      }, 200);
    }, 1000);
  }
};
findnumber = () => {
  let data = (document.querySelector(".-y4n1 img").onload = () => {
    console.log(
      "phone number logged in",
      document.querySelector(".-y4n1 img").src
    );
  });
};
startTimer();

//917309294172
