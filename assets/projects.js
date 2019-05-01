"use strict";

class Projects extends Structure {
    constructor(parameters = {}) {
        super(parameters);
    }

    _prepareWrapper() {
        super._prepareWrapper();
        Structure._menuWrapperNode = this._menuWrapperNode = document.createElement('div');
        this._menuWrapperNode.id = 'menu-wrapper';
        this._wrapperNode.appendChild(this._menuWrapperNode);
        return true;
    }

    _showItemModal(id = false) {
        let item = this._getItemById(id);
        let self = this;
        return new Promise(function (resolve, reject) {
            resolve(self._genItemMenu(item));
        }).then(self._renderItemMenu.bind(self));
    }

    _genItemMenu(item = false) {
        if (!item) throw new Error(`Item data is Empty!`);
        let data = {item, source: false};
        switch (item.type) {
            case 'profile':
                data.source = `<div class="menu-header">Сотрудник</div><div class="menu-body">
<div><label>ФИО</label><select id="profile"></select></div>
<div><label>Должность</label><select id="role"></select></div></div>
<div class="menu-controls"><button disabled>Удалить</button><button>Сохранить</button></div>`;
                break;
            case 'department':
                data.source = `empty`;
                break;
            case 'division':
                data.source = `empty`;
                break;
            default:
                data.source = `Error`;
                break;
        }
        return data;
    }

    _renderItemMenu({item, source} = {}) {
        if (!item || !source) throw new Error(`Menu data is Empty!`);
        let itemNode = document.querySelector(`[data-structure-item="${item.id}"]`);
        let menuNode = document.createElement('div');
        menuNode.classList.add('structure-menu');
        menuNode.dataset.structureItemMenu = item.id;
        menuNode.innerHTML = source;
        // TODO: Close button
        menuNode.style.width = Projects._itemBlockWidth + 'px';
        this._menuWrapperNode.appendChild(menuNode);
        menuNode.style.top = (itemNode.parentNode.parentNode.offsetTop + 20) + 'px';
        menuNode.style.left = (itemNode.offsetLeft - itemNode.parentNode.scrollLeft) + 'px';
        this._loadVariantsData().then(this._renderVariantsData.bind(this));
        return menuNode;
    }

    _loadVariantsData() {
        return fetch('variants.json').then(function (response) {
            return response.json();
        }).then(function (response) {
            if (!response || !response.variants) throw new Error(`Variants data empty`);
            if (response.variants) return response.variants;
            return false;
            // return this._parseStructureData(response.structure);
        }.bind(this))
    }

    _renderVariantsData(variants = false) {
        if (!variants.profiles || !variants.roles) throw new Error(`Error while parsing variants data`);
        let menuNode = document.querySelector(`[data-structure-item-menu]`);
        let profileSelect = menuNode.querySelector(`#profile`);
        for (let i in variants.profiles) profileSelect.innerHTML += `<option value="${variants.profiles[i].id}">${variants.profiles[i].name}</option>`;
        let roleSelect = menuNode.querySelector(`#role`);
        for (let i in variants.roles) roleSelect.innerHTML += `<option value="${variants.roles[i].role}">${variants.roles[i].title}</option>`;
        return true;
    }
}