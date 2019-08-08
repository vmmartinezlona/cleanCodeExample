import { References } from './References';
import { Search } from '../Entities/Entities/busqueda';

export class FunGen {
    private references: References = new References();



    // ------------------------------------------------------------------------- USER
    isLogged(userIdentificador: string) {
        if (userIdentificador && userIdentificador !== '') {
            return true;
        }
        return false;
    }






    // ________________________________________________________________________ TEXT/String

    getCleanedString(text: string): string {
        if (this.isEmptyString(text)) {
            return text;
        }

        text = this.deleteSpecialCharacters(text);
        text = text.toLowerCase();
        text = this.deleteAccents(text);

        return text;
    }



    isEmptyString(string: string): boolean {
        if (string && string !== '') {
            return false;
        }
        return true;
    }

    deleteSpecialCharacters(string: string): string {
        const specialCharacters = '!@#$^&%*()+=-[]\/{}|:<>?,.';

        for (let i = 0; i < specialCharacters.length; i++) {
            string = string.replace(new RegExp('\\' + specialCharacters[i], 'gi'), '');
        }

        return string;
    }

    deleteAccents(string: string): string {
        string = string.replace(/á/gi, 'a');
        string = string.replace(/é/gi, 'e');
        string = string.replace(/í/gi, 'i');
        string = string.replace(/ó/gi, 'o');
        string = string.replace(/ú/gi, 'u');
        string = string.replace(/ñ/gi, 'n');

        return string;
    }

    capitallize(text: string): string {
        if (this.isEmptyString(text)) {
            return text;
        }
        return text[0].toUpperCase() + text.substring(1, text.length);
    }












    // _________________________________________________________________________ DATA FORMATS
    // Convert 1000000 to 1,000,000
    convertIntToPrice(price) {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    formatPrice(price: number): string {
        if (price) {
            return price.toLocaleString().toString().replace(/\./g, ',');
        } else {
            return '';
        }
    }

    formatPhoneNumber(number: string): string {
        const formatNumber = number.slice(0, 3) + '-' + number.slice(3, 6) + '-' + number.slice(6);
        return formatNumber;
    }


    // _________________________________________________________________________ CONFIGURE ELEMENTS 
    // ____________________________________________________________ Asociaciones
    async setUserType(userIdentificador: string, _agencyService) {
        const this_ = this;
        let userType = null;

        if (this.isEmptyString(userIdentificador)) {
            return userType;
        }

        const response = await _agencyService.getAgencyById(userIdentificador);
        if (response.message === 'ok') {
            userType = this_.references.AGENCY_REFERENCE;
        } else {
            userType = this_.references.USER_REFERENCE;
        }

        return userType;
    }






    async setAssociationButton(senderIdentificador, senderType, receiverIdentificador, receiverType, _associationService){
        let isAssociation = 'none';

        // Somos la misma entidad
        if(senderIdentificador == receiverIdentificador){
            isAssociation = 'mismo'

        //_ asociación usuario - agencia
        }else if(senderType == this.references.USER_REFERENCE &&    
            receiverType == this.references.AGENCY_REFERENCE){ 
            await _associationService.getAssociation(senderIdentificador, senderType, receiverIdentificador, receiverType, 
                (response): void => {
                if(response){
                    isAssociation = response.association.estado;
                }
            });

        //_ asociacion agencia - agencia/grupo 
        } else if(senderType == this.references.AGENCY_REFERENCE &&
            (receiverType == this.references.AGENCY_REFERENCE || receiverType == this.references.GROUP_REFERENCE)){ 
        
            await _associationService.getAssociation(senderIdentificador, senderType, receiverIdentificador, receiverType, 
                (response): void => {
                if(response)
                    isAssociation = response.association.estado;
            });
        }

        return isAssociation;
    }





    //__________________________________________________________________________ FILES
    




    // __________ Upload a file, inside the functions the image is pre-processed
    uploadFile(position: number, url: string, files: File, Identificador: string, entityType: string, 
        callback:(message, url, position) => void){
        // __ Compress the image
		this.resizeFile(files, (file, blob): void => {

	        var formData: any = new FormData();
            var xhr = new XMLHttpRequest();
            // Data to push in S3
            formData.append("entityUid", Identificador);
            formData.append('entityType', entityType);
            // Type of file
	        if(file != null) {
	       	 	formData.append('image', file, "imagen.jpg");
	        } else {
	        	formData.append('image', blob, "imagen.jpg");
            }
            // 
	        xhr.onreadystatechange = function(){
	            if(xhr.readyState == 4){
	                if(xhr.status == 200) {
	                    var res = JSON.parse(xhr.response);
	                    callback("ok", res.url, position);
	                } else {
	                    callback(xhr.response, "", position);
	                }
	            }
            }
            // Push to S3
	        xhr.open('POST', url, true);
	        xhr.send(formData);
        });
    }

    // ____________________________________________ Resize and compress the file
	resizeFile(file, callback: (file: File, blob: Blob) => void) {
        var this_ = this;
        var img = new Image()
        img.src = file.dataURL;
        // img.crossOrigin = "anonymous";

        img.onload = () => {
            // Reducir imagen a un maximo de 1 Millon de pixeles (1MP)
            var width = img.width;
            var height = img.height;

            if(file.size / 1024 > 500) {
                var pixelNumber = img.width * img.height;
                var factor = Math.sqrt(1000000 / pixelNumber);
                width = width * factor;
                height = height * factor;
            }					

            var canvas = document.createElement("canvas")
            canvas.width = width;
            canvas.height = height;

            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height);

            try {
                callback(null, this_.convertCanvasToBlob(canvas.toDataURL("image/jpeg")));
            } catch{
                callback(null, null);
            }
        };
	}

	convertCanvasToBlob (dataURL){
    	var blobBin = atob(dataURL.split(',')[1]);
		var array = [];
		for(var i = 0; i < blobBin.length; i++) {
		    array.push(blobBin.charCodeAt(i));
		}
		var file = new Blob([new Uint8Array(array)], {type: 'image/png'});
		return file;
    }

    getPictureData(img, index:number, orientation: (index:number, orientation:number) => void){
		// img.crossOrigin = "anonymous";
        //  EXIF.getData(img, function() {
        //     orientation(index, EXIF.getTag(this, "Orientation"));
        // });
	}

	rotatePictureControl(img, control, orientationCallback:(orientation:number) => void) {
		this.getPictureData(img, 0, function(indexTemp, orientation) {
			if(orientation == 8) {
			    $("#" + control).addClass("rotate-270");
			} else if(orientation == 5 || orientation == 6 || orientation == 7) {
			    $("#" + control).addClass("rotate-90");
			} else if(orientation == 3) {
			    $("#" + control).addClass("rotate-180");
			} 
			orientationCallback(orientation);
		});
	}

	base64ToFile(dataURI, origFile) {
		var byteString, mimestring;

		if (dataURI.split(',')[0].indexOf('base64') !== -1) {
			byteString = atob(dataURI.split(',')[1]);
		} else {
			byteString = decodeURI(dataURI.split(',')[1]);
		}

		mimestring = dataURI.split(',')[0].split(':')[1].split(';')[0];

		var content = new Array();
		for (var i = 0; i < byteString.length; i++) {
			content[i] = byteString.charCodeAt(i);
		}
		var newFile = new Blob(
			[new Uint8Array(content)], { type: mimestring }
		);

		// Copy props set by the dropzone in the original file
		var origProps = [
			"upload", "status", "previewElement", "previewTemplate", "accepted"
		];

		$.each(origProps, function (i, p) {
			newFile[p] = origFile[p];
		});
		return newFile;
    }
    





	//____________________________________________________________________________________ LIST

	getLocationData(callback: (city: string, state: string) => void) {
		$.getJSON('https://ipapi.co/json/', function(data){
		  callback(data.city, data.region);
		});
	}

    






    isEmptyArray(array: Array<any>) {
        if (array && array.length > 0) {
            return false;
        }
        return true;
    }

    // ________________________________________________________________________ FILTERS

    filterPropertyList(filteredIdList, completeIdList) {
        let propertyCardList = [];

        for (const property of completeIdList) {
            if (filteredIdList.includes(property.propertyIdentificador)) {
                propertyCardList.push(property);
            }
        }

        return propertyCardList;
    }

    sortProperties(propertyCardList, search) {
        if (this.isEmptyArray(propertyCardList)) {
            return propertyCardList;
        }

        if (search.ordenAntiguo) {
            propertyCardList.sort(this.compare('tiempoRegistro', 'desc'));
        } else if (search.ordenMayorPrecio) {
            propertyCardList.sort(this.compare('precio', 'desc'));
        } else if (search.ordenMenorPrecio) {
            propertyCardList.sort(this.compare('precio', 'asc'));
        } else {
            propertyCardList.sort(this.compare('tiempoRegistro', 'asc'));
        }

        return propertyCardList;
    }

    createIdentificadorArray(propertyCardList) {
        let propertyCardIdComplete = [];

        for (const property of propertyCardList) {
            propertyCardIdComplete.push(property.propertyIdentificador);
        }
        return propertyCardIdComplete;
    }


  

    isInTheLocation(searchLocation: string, propertyLocation: string): boolean {
        if (this.isEmptyString(searchLocation) || this.isEmptyString(propertyLocation)) {
            return false;
        }

        return (propertyLocation === searchLocation);
    }

    isTheSameCategory(searchCategory: string, propertyCategory: string): boolean {
        if (this.isEmptyString(searchCategory) || this.isEmptyString(propertyCategory)) {
            return false;
        }

        return (searchCategory === this.references.SEARCH_DEFAULT_CATEGORY_VALUE ||
                propertyCategory === searchCategory);
    }

    isTheSameTransaction(searchTransaction: string, propertyTransaction: string): boolean {
        if (this.isEmptyString(searchTransaction) || this.isEmptyString(propertyTransaction)) {
            return false;
        }

        if (searchTransaction === this.references.SEARCH_DEFAULT_TRANSACTION_VALUE ||
            propertyTransaction === searchTransaction) {
            return true;
        } else {
            return false;
        }
    }

    isInTheNeigborhood(searchNeigborhood: Array<string>, propertyNeigborhood: string): boolean {
        if (this.isEmptyArray(searchNeigborhood)) {
            return true;
        }

        let isInTheNeigborhood = false;
        for (const neigborhood of searchNeigborhood) {
            if (propertyNeigborhood === neigborhood) {
                isInTheNeigborhood = true;
            }
        }

        return isInTheNeigborhood;
    }

    // Greater than 0
    isValidNumber(price: number) {
        if (price && price > 0) {
            return true;
        } else {
            return false;
        }
    }





    async filterSimpleList(propertyCardList, search){
        let resultProperties = [];

        const searchCleanEstado = this.getCleanedString(search.estado);
        const searchCleanCiudad = this.getCleanedString(search.ciudad);

        for (const property of propertyCardList) {
            const propertyEstado = this.getCleanedString(property.estado);
            const propertyCiudad = this.getCleanedString(property.ciudad);

            if (!this.isInTheLocation(searchCleanEstado, propertyEstado) ||
                !this.isInTheLocation(searchCleanCiudad, propertyCiudad) ||
                !this.isTheSameCategory(search.categoria, property.categoria) ||
                !this.isTheSameTransaction(search.tipoTransaccion, property.tipoTransaccion) ||
                !this.isInTheNeigborhood(search.colonia, property.colonia) ||
                !this.isInTheNumberRange(search.precioMinimo, search.precioMaximo, property.precio)) {
                continue;
            }

            resultProperties.push(property);
        }
        return resultProperties;
    }



    isInTheNumberRange(searchMinNumber, searchMaxNumber, propertyValue): boolean {
        const minValue = Number(searchMinNumber);
        const maxValue = Number(searchMaxNumber);
        const value = Number(propertyValue);

        if (!propertyValue) {
            return false;
        } else if (!this.isValidNumber(minValue) || !this.isValidNumber(maxValue)) {
            return true;
        } else if (value >= minValue && value <= maxValue) {
            return true;
        } else {
            return false;
        }
    }



    async filterFullList(propertyCardList, search: Search) {
        let resultProperties = [];

        for (const property of propertyCardList) {
            if (
                (search.amueblada && !property.amueblada) ||
                (search.zonaPrivada && !property.zonaPrivada) ||
                (search.vendidaDuenio && !property.vendidaDuenio)  ||
                (search.comparteComision && property.porcentajeComision <= 0) ||
                (search.plantas && property.plantas !== 1) ||
                (search.vendidaDuenio && !property.vendidaDuenio) ||
                (property.mediosBanios < search.banios) ||
                (property.estacionamientos < search.estacionamientos) ||
                (property.habitaciones < search.habitaciones) ||
                !this.isInTheNumberRange(search.m2ConstruccionMinimo, search.m2ConstruccionMaximo, property.m2Construccion) ||
                !this.isInTheNumberRange(search.m2TerrenoMinimo, search.m2TerrenoMaximo, property.m2Terreno)
            ) {
                continue;
            } else {
                resultProperties.push(property);
            }
        }
        return this.sortProperties(propertyCardList, search);
    }




    // ________________________________________________________________________ Sort
    // To sort object array by key
    compare(key, order= 'asc') {
        return function(object1, object2) {
            if (!object1.hasOwnProperty(key) || !object2.hasOwnProperty(key)) {
                return 0;
            }

            const property1 = (typeof object1[key] === 'string') ?
                object1[key].toLowerCase() : object1[key];
            const property2 = (typeof object2[key] === 'string') ?
                object2[key].toLowerCase() : object2[key];

            let comparison = 0;
            if (property1 > property2) {
            comparison = 1;
            } else if (property1 < property2) {
            comparison = -1;
            }

            return (order === 'desc' ? -1 * comparison : comparison);
        };
    }

    manageScroll(status) {
    }




    // __________________________________________________________________________ Block / Unblock scroll
    lockScroll(status= false) {

    }

    // __________________________________________________________________________ AWAIT/SLEEP
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    showError(error) {
        alert('Error ' + error + ' : ¡Ha ocurrido un error! Por favor, inténtalo más tarde');
    }







    // If empty get the default photo, else return the prhoto
    getPicture(entityType, photo) {
        if (!this.isEmptyArray(photo)) {
            return photo;
        }

        switch(entityType){
            case this.references.PROPERTY_REFERENCE:
                return '../../../assets/images/default/not_property_picture.png';
            case this.references.AGENCY_REFERENCE:
                return '../../../assets/images/default/agency_picture.svg';
            case this.references.USER_REFERENCE:
                return '../../../assets/images/default/default_profile_picture.png';
        }
    }






    //__________________________________________________________________________ DATE/TIME
    getDate(dateInput){
        if(!dateInput || dateInput == '') return dateInput;

        
        let dateAuxiliar = dateInput.split(' ')[1].split('/');

        let day = ("0" + dateAuxiliar[0]).slice(-2);
        let month = ("0" + this.getMonthNumber(dateAuxiliar[1])).slice(-2);
        let year = dateAuxiliar[2];

        let date = year + '-' + month + '-' + day + ' ';

        return  date;
    }

    getHour(hourInput){
        if(!hourInput || hourInput == '') return hourInput;

        let hourAuxiliar = hourInput.split(' ')[3];

        let isPM = hourAuxiliar.slice(5) == 'PM' ? true : false;
        let hour:any = Number(hourAuxiliar.slice(0,2)) + (isPM ? 12 : 0);
        hour = ("0" + hour).slice(-2);
        
        let minute = hourAuxiliar.slice(3, 5);

        let fullhour = hour + ':' + minute;

        return fullhour;
    }

    getMonthNumber(month){
        switch(month){
            case 'enero':
                return 1;
              case 'febrero':
                return 2;
              case 'marzo':
                return 3;
              case 'abril':
                return 4;
              case 'mayo':
                return 5;
              case 'junio':
                return 6; 
              case 'julio':
                return 7;
              case 'agosto':
                return 8; 
              case 'septiembre':
                return 9;
              case 'octubre':
                return 10;
              case 'noviembre':
                return 11;
              case 'diciembre':
                return 12;
        }
    }
}