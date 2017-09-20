load('api_config.js');
load('api_gpio.js');
load('api_net.js');
load('api_sys.js');
load('api_timer.js');
load('api_mqtt.js');

let led = 2;//Cfg.get('app.pin_led');
let mic = 5;//Cfg.get('app.pin_mic');     D1
let scream = 0;
let mqtt_topic = "channels/XXXXXXXXXXXx/publish/fields/field1/XXXXXXXXXX";



print('LED GPIO:', led, 'MIC GPIO:', mic);

let getInfo = function() {
  return JSON.stringify({
    total_ram: Sys.total_ram(),
    free_ram: Sys.free_ram()
  });
};

let sendTS = function(value) {
  let msg = JSON.stringify(scream);
  //QoS = 0 and retain = 0 acordantly to https://www.mathworks.com/help/thingspeak/publishtoachannelfieldfeed.html
  let res = MQTT.pub(mqtt_topic, msg, 0, false);
  print('Published:', res ? 'yes' : 'no');
};

// Blink built-in LED every second
GPIO.set_mode(led, GPIO.MODE_OUTPUT);
Timer.set(1000 /* 1 sec */, true /* repeat */, function() {
  let value = GPIO.toggle(led);
  print(value ? 'Tick' : 'Tock', 'uptime:', Sys.uptime(), getInfo());
}, null);

// Scream detected
GPIO.set_button_handler(mic, GPIO.PULL_UP, GPIO.INT_LEVEL_HI, 300, function() {
  print('Screamed....oh well..... Actual number: ', scream);
  scream = scream + 1;
}, null);

//Sends Scream information to ThinkSpeaks
Timer.set(15000 /* 15 sec */, true /* repeat */, function() {
  print('Sending screams..... Actual number: ', scream);
  sendTS(scream);
  scream = 0;
}, null);

// Monitor network connectivity.
Net.setStatusEventHandler(function(ev, arg) {
  let evs = '???';
  if (ev === Net.STATUS_DISCONNECTED) {
    evs = 'DISCONNECTED';
  } else if (ev === Net.STATUS_CONNECTING) {
    evs = 'CONNECTING';
  } else if (ev === Net.STATUS_CONNECTED) {
    evs = 'CONNECTED';
  } else if (ev === Net.STATUS_GOT_IP) {
    evs = 'GOT_IP';
  }
  print('== Net event:', ev, evs);
}, null);
