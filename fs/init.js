load('api_config.js');
load('api_gpio.js');
load('api_net.js');
load('api_sys.js');
load('api_timer.js');
load('api_mqtt.js');
load('api_blynk.js');
load('api_pwm.js');

let led = 2;//Cfg.get('app.pin_led');
let mic = 5;//Cfg.get('app.pin_mic');     D1
let scream = 0;
let mqtt_topic = "channels/254839/publish/fields/field1/XXXX";

//Screams Variables
let scream_reading_pin = 2;
let blynk_scream = 0;


//Stepper motor blynk
let direction_blynk_pin = 1; //virtual pin
let on_off_blynk_pin = 0; //virtual pin

//Stepper Motor Pin Variables
let motor_enable_pin = 14; //D5
let motor_direction_pin = 12; //D6
let motor_control_pin = 13; //D7


//PROG

print('LED GPIO:', led, 'MIC GPIO:', mic);

let getInfo = function() {
  return JSON.stringify({
    total_ram: Sys.total_ram(),
    free_ram: Sys.free_ram()
  });
};

let sendTS = function(value) {
  let msg = JSON.stringify(scream);
  //QoS = 0 and retain = 0 in https://www.mathworks.com/help/thingspeak/publishtoachannelfieldfeed.html
  let res = MQTT.pub(mqtt_topic, msg, 0, false);
  print('Published:', res ? 'yes' : 'no');
};

let sendBlynk = function(value) {
  print("TODO");
  //function to send
};




let Motor = {

  init: function(_motor_control_pin, _motor_direction_pin, _motor_enable_pin){ 
    //Stores pin information
    this._motor_control_pin = _motor_control_pin;
    this._motor_direction_pin = _motor_direction_pin;
    this._motor_enable_pin = _motor_enable_pin;
    
    //Setup pins as output
    GPIO.set_mode(this._motor_control_pin, GPIO.MODE_OUTPUT);
    GPIO.set_mode(this._motor_direction_pin, GPIO.MODE_OUTPUT);
    GPIO.set_mode(this._motor_enable_pin, GPIO.MODE_OUTPUT);

    //Stop
    this.stop();
    //Foward
    this.foward();
  },
  
  foward: function() {
    GPIO.write(this._motor_direction_pin, 0);
  },

  reverse: function() {
    GPIO.write(this._motor_direction_pin, 1);
  },

  start: function() {
    GPIO.write(this._motor_enable_pin, 0);
    PWM.set(this._motor_control_pin, 500, 0.5);
  },

  stop: function() {
    GPIO.write(this._motor_enable_pin, 1);
    PWM.set(this._motor_control_pin, 0, 0.5);
  },

};

Motor.init(motor_control_pin, motor_direction_pin, motor_enable_pin);
print("motor ok")

// Blink built-in LED every second
GPIO.set_mode(led, GPIO.MODE_OUTPUT);
Timer.set(1000 /* 1 sec */, true /* repeat */, function() {
  let value = 0;
  if(scream !== 0){
    value = GPIO.toggle(led);
  }else{
    GPIO.write(led, 1);
  }
  print(value ? 'Tick' : 'Tock', 'uptime:', Sys.uptime(), getInfo());
}, null);

// Scream detected
GPIO.set_button_handler(mic, GPIO.PULL_UP, GPIO.INT_LEVEL_HI, 200, function() {
  print('Screamed....oh well..... Actual number: ', scream);
  scream = scream + 1;
  blynk_scream = blynk_scream + 1;
}, null);

//Sends Scream information to ThinkSpeaks
Timer.set(15000 /* 15 sec */, true /* repeat */, function() {
  print('Sending screams..... Actual number: ', scream);
  sendTS(scream);
  scream = 0;
}, null);




//Motor Control
Blynk.setHandler(function(conn, cmd, pin, val, id) {
  let ram = Sys.free_ram() / 1024;
  if (cmd === 'vr') {
    if(pin === scream_reading_pin){
      Blynk.virtualWrite(conn, pin, blynk_scream, id);
      blynk_scream = 0;
    }else{
      Blynk.virtualWrite(conn, pin, ram, id);
    }
  } else if (cmd === 'vw') {
    	// Writing to virtual pin translate to writing to physical pin
      //GPIO.set_mode(pin, GPIO.MODE_OUTPUT);
      //GPIO.write(pin, val);
      if(pin === on_off_blynk_pin) {
        if(val === 1){
          Motor.start();
        }else if(val === 0){
          Motor.stop();
        }
      } else if( pin ===  direction_blynk_pin){
          if(val === 1){
            print("up");
            Motor.foward();
          } else if(val === 0){
            print("down");
            Motor.reverse();
          }
      }
  }
  print('BLYNK JS handler, ram', ram, cmd, id, pin, val);
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