"use strict";

class Structure {

    constructor({wrapper = 'body', structureDataUrl = 'structure.json'} = {}) {
        this._parameters = {structureDataUrl};
        let _wrapperNode = this._wrapperNode = wrapper instanceof HTMLElement ? wrapper : document.querySelector(wrapper);
        if (!_wrapperNode || !_wrapperNode.innerHTML) throw new Error(`Wrapper ${wrapper} not accessible`);
        return this._updateStructureData()
            .then(this._prepareWrapper.bind(this))
            .then(function () {
                window.addEventListener('resize', Structure.updateActiveItemPathes);
                return this._renderStructure(false, this._getParameter('renderRules', '_root', 'showDepth'));
            }.bind(this))
            .catch(function (error) {
                console.error(error);
                return false;
            }).result;
    }

    static closeModals() {
        document.querySelectorAll(`[data-structure-modal]`).forEach(function (modal) {
            modal.parentNode.removeChild(modal)
        });
    }

    static calculatePathPositionHandler(event) {
        let pathNode = false;
        if (this.dataset.structurePathParentItem) {
            pathNode = this
        } else {
            pathNode = document.querySelector(`[data-structure-path="${this.dataset.pathScrollEvent}"]`);
        }
        let itemId = pathNode.dataset.structurePathParentItem;
        if (!itemId) return Structure._removeActiveItemPath(itemId);
        let itemNode = document.querySelector(`[data-structure-item="${itemId}"]`);
        if (!itemNode) return Structure._removeActiveItemPath(itemId);
        let targetLevelId = parseInt(itemNode.parentNode.dataset.structureLevel) + 1;
        if (!targetLevelId || isNaN(targetLevelId)) return Structure._removeActiveItemPath(itemId);
        let targetLevelNode = document.querySelector(`[data-structure-level="${targetLevelId}"]`);
        if (!targetLevelNode) return Structure._removeActiveItemPath(itemId);
        let targetNode = targetLevelNode.querySelector('.active[data-structure-item]');
        if (!targetNode) targetNode = targetLevelNode.querySelector('[data-structure-item]');
        if (!targetNode) return Structure._removeActiveItemPath(itemId);
        // let levelNode = itemNode.parentNode;
        let position = {
            offsetTop: targetNode.parentNode.parentNode.offsetTop,
            offsetLeft: itemNode.offsetLeft - itemNode.parentNode.scrollLeft + 150
        };
        pathNode.style.opacity = 1;
        if (targetNode.classList.contains('partner') || targetNode.classList.contains('active')) {
            position.targetLeft = targetNode.offsetLeft - targetNode.parentNode.scrollLeft + 150;
        } else {
            let levelItems = targetLevelNode.querySelectorAll('[data-structure-item]');
            if (levelItems.length > 1) {
                let leftLevelItemOffset = levelItems[0].offsetLeft - levelItems[0].parentNode.scrollLeft + 150;
                let rightLevelItemOffset = levelItems[levelItems.length - 1].offsetLeft - levelItems[levelItems.length - 1].parentNode.scrollLeft + 150;
                if (position.offsetLeft >= leftLevelItemOffset && position.offsetLeft <= rightLevelItemOffset) {
                    pathNode.style.opacity = 0;
                } else if (position.offsetLeft < leftLevelItemOffset) {
                    position.targetLeft = leftLevelItemOffset;
                } else {
                    position.targetLeft = rightLevelItemOffset;
                }
            } else position.targetLeft = document.body.clientWidth / 2;
        }
        position.pathLeft = position.offsetLeft > position.targetLeft ? position.targetLeft : (position.offsetLeft);
        position.pathWidth = (position.offsetLeft > position.targetLeft ? (position.offsetLeft - position.targetLeft) : (position.targetLeft - position.offsetLeft));
        pathNode.style.top = position.offsetTop + 'px';
        pathNode.style.left = position.pathLeft + 'px';
        pathNode.style.width = position.pathWidth + 'px';
    }

    static calculateSubPathPositionHandler(event) {
        let pathNode = document.querySelector(`[data-structure-sub-path="${this.dataset.subPathScrollEvent}"]`);
        let itemId = pathNode.dataset.structurePathTargetItem;
        if (!itemId) return;
        let itemNode = document.querySelector(`[data-structure-item="${itemId}"]`);
        if (!itemNode) return;
        let targetLevelId = parseInt(itemNode.parentNode.dataset.structureLevel);
        if (!targetLevelId || isNaN(targetLevelId)) return;
        let targetLevelNode = document.querySelector(`[data-structure-level="${targetLevelId}"]`);
        if (!targetLevelNode) return;
        let targetNode = targetLevelNode.querySelector('[data-structure-item]');
        if (!targetNode) return;

        let position = {
            offsetTop: targetNode.offsetTop - 72,
            offsetLeft: itemNode.offsetLeft - itemNode.parentNode.scrollLeft + 150
        };
        if (targetNode.classList.contains('partner') || targetNode.classList.contains('active')) {
            position.targetLeft = targetNode.offsetLeft - targetNode.parentNode.scrollLeft + 150;
            //else position.targetLeft = document.body.clientWidth / 2;
            position.pathLeft = position.offsetLeft > position.targetLeft ? position.targetLeft : (position.offsetLeft);
            position.pathWidth = (position.offsetLeft > position.targetLeft ? (position.offsetLeft - position.targetLeft) : (position.targetLeft - position.offsetLeft));
        }
        pathNode.style.top = position.offsetTop + 'px';
        pathNode.style.left = position.pathLeft + 'px';
        pathNode.style.width = position.pathWidth + 'px';
    }

    static calculateLevelScrollButtons() {

    }

    static updateActiveItemPathes() {
        document.querySelectorAll('[data-structure-path]').forEach(function (path) {
            Structure.calculatePathPositionHandler.call(path);
        });
        document.querySelectorAll('[data-structure-sub-path]').forEach(function (path) {
            Structure.calculateSubPathPositionHandler.call(path);
        });

        document.querySelectorAll('[data-structure-level]').forEach(function (levelNode) {
            if (levelNode.scrollWidth > document.body.clientWidth) {
                if (levelNode.scrollLeft < 100)
                    Structure._levelScrollButton(levelNode, 'left', false);
                else Structure._levelScrollButton(levelNode, 'left', true);
                if (levelNode.scrollWidth - levelNode.scrollLeft - document.body.clientWidth < 100)
                    Structure._levelScrollButton(levelNode, 'right', false);
                else Structure._levelScrollButton(levelNode, 'right', true);
            } else {
                Structure._levelScrollButton(levelNode, 'left', false);
                Structure._levelScrollButton(levelNode, 'right', false);
            }
        })
    }

    static _levelScrollButton(levelNode, side, state = true) {
        switch (side) {
            case 'left':
                levelNode.parentNode.querySelector('.structure-scroll-left').style.display = state ? 'block' : 'none';
                break;
            case 'right':
                levelNode.parentNode.querySelector('.structure-scroll-right').style.display = state ? 'block' : 'none';
                break;
        }
    }

    static _removeActiveItemPath(level) {
        Structure._pathesWrapperNode.querySelectorAll(`[data-structure-path="${level}"]`).forEach(function (pathNode) {
            pathNode.parentNode.removeChild(pathNode);
        });
    }

    _updateStructureData(url = this._parameters.structureDataUrl) {
        return fetch(url)
            .then(function (response) {
                return response.json();
            }).then(function (response) {
                if (!response || !response.structure) throw new Error(`Structure data empty`);
                if (response.parameters) Object.assign(this._parameters, response.parameters, this._parameters);
                return this._parseStructureData(response.structure);
            }.bind(this))
    }

    _parseStructureData(structure = {}) {
        this._structure = structure;
        this._structureItems = [];
        this._structureItems.push({id: 0, type: 'root', level: -1, submissive: this._structure}); // TODO: change root level to 0 (zero)
        this._parseItemData(this._structureItems[0]);
        return true;
    }

    _parseItemData(parentItem) {
        if (parentItem.partners)
            for (let i in parentItem.partners) {
                let itemData = parentItem.partners[i];
                itemData.parentItem = parentItem;
                itemData.id = this._structureItems.length;
                itemData.level = parentItem.level;
                this._structureItems[itemData.id] = itemData;
                this._parseItemData(itemData);
            }
        if (parentItem.assistants)
            for (let i in parentItem.assistants) {
                let itemData = parentItem.assistants[i];
                itemData.parentItem = parentItem;
                itemData.id = this._structureItems.length;
                itemData.level = parentItem.level;
                this._structureItems[itemData.id] = itemData;
                this._parseItemData(itemData);
            }
        let childLevel = parentItem.level + 1;
        if (parentItem.submissive)
            for (let i in parentItem.submissive) {
                let itemData = parentItem.submissive[i];
                itemData.parentItem = parentItem;
                itemData.id = this._structureItems.length;
                itemData.level = childLevel;
                this._structureItems[itemData.id] = itemData;
                this._parseItemData(itemData);
            }
    }

    _prepareWrapper() {
        // console.log('1: _prepareWrapper');
        this._wrapperNode.classList.add('structure-wrapper');
        Structure._pathesWrapperNode = this._pathesWrapperNode = document.createElement('div');
        this._pathesWrapperNode.id = 'path-wrapper';
        this._wrapperNode.innerHTML = '';
        this._wrapperNode.appendChild(this._pathesWrapperNode);
        return true;
    }

    _renderStructure(parentId = false, depth = 0) {
        // console.log('2: _renderStructure');
        let item = this._getItemById(parentId);
        let childLevel = item.level + 1;
        // if (this._parameters && this._parameters.renderRules && this._parameters.renderRules[item.type] && this._parameters.renderRules[item.type].showDepth)
        let depthRule = this._getParameter('renderRules', item.type, 'showDepth');
        if (depthRule) depth = depthRule;
        let destroyLevelId = childLevel + depth;
        for (let i = childLevel; i <= childLevel + depth; i++) {
            destroyLevelId = i + 1;
            this._setActiveItem(item.id);
            let level = (!this._level || !this._level[i]) ? this._renderLevel(i) : this._level[i];
            // level.node.innerHTML = '';
            this._cleanLevel(level.id);
            if (!item.submissive || item.submissive.length === 0) break;
            level.items = item.submissive;
            if (level.items.length === 1) level.node.classList.add('center-items');
            this._renderItems(level.items, i);
            let rightSpace = level.node.appendChild(document.createElement('div'));
            rightSpace.classList.add('right-space');
            this._createActiveItemPath(item.id);
            item = level.items[0];
        }
        this._destroyStructure(destroyLevelId);
    }

    _renderLevel(level = false) {
        if (!this._level) this._level = {};
        if (typeof level !== "number" || isNaN(level = parseInt(level))) throw new Error(`Level ${arguments[0]} is incorrect`);
        let targetLevel = this._level[level] = {
            id: level,
            node: document.createElement('section'),
            items: []
        };

        let levelWrapperNode = document.createElement('div');
        levelWrapperNode.classList.add('level-wrapper');

        targetLevel.node.addEventListener('scroll', Structure.updateActiveItemPathes);

        targetLevel.leftButton = document.createElement('button');
        targetLevel.leftButton.classList.add('structure-scroll-left');
        targetLevel.leftButton.addEventListener('click', function (event) {
            let scrollSection = this.parentNode.querySelector('section');
            let scroll = scrollSection.scrollLeft - 340;
            scrollSection.scroll(scroll, false);
        });
        levelWrapperNode.appendChild(targetLevel.leftButton);

        levelWrapperNode.appendChild(targetLevel.node);

        targetLevel.rightButton = document.createElement('button');
        targetLevel.rightButton.classList.add('structure-scroll-right');
        targetLevel.rightButton.addEventListener('click', function (event) {
            let scrollSection = this.parentNode.querySelector('section');
            let scroll = scrollSection.scrollLeft + 340;
            scrollSection.scroll(scroll, false);
        });
        levelWrapperNode.appendChild(targetLevel.rightButton);

        targetLevel.node.dataset.structureLevel = level;

        this._wrapperNode.appendChild(levelWrapperNode);
        return targetLevel;
    }

    _cleanLevel(level = false) {
        this._level[level].node.scrollTo(0, 0);
        this._level[level].node.querySelectorAll('.item').forEach(function (item) {
            item.parentNode.removeChild(item);
        });
        this._level[level].node.querySelectorAll('.right-space').forEach(function (item) {
            item.parentNode.removeChild(item);
        });
        this._level[level].node.className = '';
        Structure._removeActiveItemPath(level);
    }

    _getItemById(id = false) {
        if (!id) return {
            id: false,
            level: -1,
            submissive: this._structure
        }; else if (!this._structureItems || !this._structureItems[id]) throw new Error(`Item with ID: ${id} not exist`);
        else return this._structureItems[id];
    }

    _renderItems(items = [], level = false) {
        for (let i in items) {
            let item = items[i];
            if (!level) level = item.level;
            let itemNode = this._renderItem(item, level);
            if (item.partners && item.partners.length > 0)
                for (let j in item.partners) {
                    let partner = item.partners[j];
                    partner.order = j;
                    this._renderItem(partner, level);
                }
            if (item.assistants && item.assistants.length > 0) {
                this._level[level].node.classList.add('extended-level');
                for (let j in item.assistants) {
                    let assistant = item.assistants[j];
                    assistant.subLevel = true;
                    assistant.order = j;
                    this._renderItem(assistant, level);
                }
            }
            if (this._level[level].node.classList.contains('extended-level') && !itemNode.classList.contains('sub-level')) {
                let styleElem = itemNode.appendChild(document.createElement("style"));
                let itemPathWidth = 0;
                let prevItem = itemNode;
                while (prevItem = prevItem.previousSibling) {
                    itemPathWidth = itemNode.offsetLeft - prevItem.offsetLeft;
                }
                styleElem.innerHTML = `.structure-wrapper section.extended-level > .item[data-structure-item="${item.id}"]:before {width: ${itemPathWidth}px;left: calc(-${itemPathWidth}px + 50%);`;
            }
        }
    }

    _renderItem(item = {}, level = false) {
        if (level === false) level = item.level;
        if (!this._level[level]) throw new Error(`Level ${level} is not available`);
        let itemNode = document.createElement('div');
        itemNode.dataset.structureItem = item.id;
        itemNode.classList.add('item');
        if (item.type) itemNode.classList.add(item.type);
        if (item.role) itemNode.classList.add(item.role);
        if (item.partners && item.partners.length > 0) itemNode.classList.add('partner');
        if (item.subLevel) itemNode.classList.add('sub-level');

        if (parseInt(item.order) === 0) itemNode.classList.add('first-after-head');
        // if (item.title) itemNode.innerHTML += `<div class="title">${item.title}</div>`;
        // if (item.description) itemNode.innerHTML += `<div class="description">${item.description}</div>`;
        if (item.roleTitle) itemNode.innerHTML += `<div class="title">${item.roleTitle}</div><div class="description">${item.name}</div>`;
        else itemNode.innerHTML += `<div class="title">${item.name}</div>`;
        let self = this;
        if (item.submissive && item.submissive.length > 0) {
            itemNode.style.cursor = 'pointer';
            itemNode.innerHTML += `<div class="state-button"></div>`;

            itemNode.addEventListener('click', function (event) {
                if (!this.dataset.structureItem) return false;
                let id = this.dataset.structureItem;
                if (this.classList.contains('active')) {
                    let level = parseInt(this.parentNode.dataset.structureLevel);
                    self._unsetActiveItems(level);
                    Structure._removeActiveItemPath(level);
                    self._destroyStructure(level + 1);
                } else {
                    self._setActiveItem(id);
                    self._renderStructure(id);
                    self._createActiveItemPath(id);
                }
                Structure.updateActiveItemPathes();
            });
        }
        let itemModal = document.createElement('div');
        itemModal.classList.add('modal-link');
        itemModal.addEventListener('click', function (event) {
            event.stopPropagation();
            if (!this.parentNode.dataset.structureItem) return false;
            let id = this.parentNode.dataset.structureItem;
            self._showItemModal(id);

        });
        itemNode.appendChild(itemModal);
        this._level[level].node.appendChild(itemNode);
        return itemNode;
    }

    _setActiveItem(id = false) {
        let item = this._getItemById(id);
        this._unsetActiveItems(item.level);
        let itemNode = document.querySelector(`[data-structure-item="${id}"]`);
        if (!itemNode) return;
        itemNode.classList.add('active');
    }

    _unsetActiveItems(level) {
        let levelNode = document.querySelector(`[data-structure-level="${level}"]`);
        if (!levelNode) return;
        levelNode.querySelectorAll(`[data-structure-item]`).forEach(this._unsetActiveItem);
    }

    _unsetActiveItem(element) {
        element.classList.remove('active');
    }

    _destroyStructure(level = 0) {
        let maxLevel = Object.values(this._level).length - 1;
        for (let i = maxLevel; i >= level; i--) {
            Structure._removeActiveItemPath(i);
            if (!this._level[i]) continue;
            let levelData = this._level[i];
            levelData.node.parentNode.removeChild(levelData.node);
            delete this._level[i];
        }
    }

    _createActiveItemPath(id) {
        let item = this._getItemById(id);
        let itemNode = document.querySelector(`[data-structure-item="${id}"]`);
        if (!itemNode) return;
        let pathId = item.level;
        Structure._removeActiveItemPath(pathId);
        let path = document.createElement('div');
        path.classList.add('active-path');
        path.dataset.structurePath = pathId;
        path.dataset.structurePathParentItem = item.id;
        let levelNode = document.querySelector(`[data-structure-level="${pathId}"]`);
        let parentLevelNode = document.querySelector(`[data-structure-level="${pathId - 1}"]`);
        if (levelNode) {
            levelNode.dataset.pathScrollEvent = pathId;
            //levelNode.addEventListener('scroll', Structure.updateActiveItemPathes);
        }
        if (parentLevelNode) {
            parentLevelNode.dataset.pathScrollEvent = pathId;
            //parentLevelNode.addEventListener('scroll', Structure.updateActiveItemPathes);
        }
        this._pathesWrapperNode.appendChild(path);
        // Structure.calculatePathPositionHandler.call(path);
        Structure.updateActiveItemPathes();//.call(path);
    }

    _createActiveSubItemPath(id) {
        let item = this._getItemById(id);
        let itemNode = document.querySelector(`[data-structure-item="${id}"]`);
        if (!itemNode) return;
        let pathId = item.level;
        this._removeActiveSubItemPath(pathId);
        let path = document.createElement('div');
        path.classList.add('active-path');
        path.dataset.structureSubPath = pathId;
        path.dataset.structureSubPathTargetItem = item.id;
        let levelNode = document.querySelector(`[data-structure-level="${pathId}"]`);
        // let parentLevelNode = document.querySelector(`[data-structure-level="${pathId - 1}"]`);
        if (levelNode) {
            levelNode.dataset.subPathScrollEvent = pathId;
            levelNode.addEventListener('scroll', Structure.updateActiveItemPathes);
        }
        this._pathesWrapperNode.appendChild(path);
        // Structure.calculatePathPositionHandler.call(path);
        Structure.updateActiveItemPathes();//.call(path);
    }

    _removeActiveSubItemPath(level) {
        this._pathesWrapperNode.querySelectorAll(`[data-structure-sub-path="${level}"]`).forEach(function (pathNode) {
            pathNode.parentNode.removeChild(pathNode);
        });
    }

    _getParameter(...path) {
        let parentParameter = this._parameters;
        while (parentParameter[path[0]]) {
            if (path.length === 1) return parentParameter[path[0]];
            parentParameter = parentParameter[path[0]];
            path.shift();
        }
        return false;
    }

    _showItemModal(id = false) {
        document.querySelectorAll(`[data-structure-modal]`).forEach(function (modal) {
            modal.parentNode.removeChild(modal)
        });
        if (!id) throw new Error('Empty item ID');
        let item = this._getItemById(id);
        let modal = document.createElement('modal');
        modal.addEventListener('click', Structure.closeModals);
        modal.classList.add('structure-modal-wrapper');
        modal.dataset.structureModal = id;
        modal.innerHTML = this._genModalContent(item);
        modal.querySelector('.structure-modal-content').addEventListener('click', e => e.stopPropagation());
        modal.querySelectorAll(`[data-structure-modal-link]`).forEach(this._prepareItemModalLink, this);
        document.body.appendChild(modal);
        // return this._loadModalData(id);
    }

    _prepareItemModalLink(link) {
        let self = this;
        link.addEventListener('click', function (event) {
            self._showItemModal(this.dataset.structureModalLink);
        });
    }

    _loadModalData(id = false) {
        let item = this._getItemById(id);
        let data = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: item.type,
                id: item.id,
            })
        };
        return fetch(this._parameters.modalDataUrl, data)
            .then(function (response) {
                return response.json();
            }).then(function (response) {
                if (!response || !response.data) throw new Error(`Modal data empty`);
                let modal = document.querySelector(`[data-structure-modal="${item.id}"]`);
                if (!modal) return;
                Object.assign(response.data, item, response.data);
                modal.innerHTML = this._genModalContent(response.data);
            }.bind(this));
    }

    _genModalContent(item) {
        if (!item.type) throw new Error('Incorrect item type');

        let source = `<div class="structure-modal-content">${genHeader(item)}<div class="modal-body">`;

        switch (item.type) {
            case 'profile':
                if (item.roleTitle) source += `<h2 class="title">${item.roleTitle}</h2>`;
                if (item.role === 'headOfDepartment' || item.role === 'headOfDivision') {
                    let structure = item.parentItem;
                    source += `<a class="structure-link" data-structure-modal-link="${structure.id}">${structure.name}</a>`;
                }
                source += `<hr><div class="sub-title">Основная информация</div>`;
                if (item.partners && item.partners.length > 0) {
                    source += `<div class="info-line"><strong>Асистент: </strong>${item.partners[0].name}</div>`;
                }
                source += genProfileContacts(item);
                break;
            case 'department':
                source += genStructureManagement(item) + `<hr><div class="sub-title">Подразделения</div>`;
                if (item.submissive && item.submissive[0]) source += `<div class="department-structure">${genDepartamentStructure(item.submissive[0])}</div>`;
                break;
            case 'division':
                source += genStructureManagement(item) + `<hr><div class="sub-title">Сотрудники отдела</div>`;
                if (item.submissive && item.submissive[0]) source += `<div class="division-structure">${genDivisionStructure(item.submissive[0])}</div>`;
                break;
            default:
                source += `Unsupported type`;
                break;
        }

        source += `</div><button class="structure-modal-close" onclick="Structure.closeModals();">×</button></div>`;

        function genHeader(item = {}) {
            let source = '';
            if (!item) return source;
            source += `<div class="modal-header">`;
            if (item.image) source += `<div class="image"><img src="${item.image}"></div>`;
            else source += `<div class="image"><img src="http://ponomarevlad.ru/assets/img/pic.jpeg"></div>`;
            source += `<div class="right-section">`;
            if (item.name) source += `<h2 class="title">${item.name}</h2>`;
            if (item.birthday) source += `<div class="birthday">Дата рождения: ${item.birthday}</div>`;
            source += `</div></div>`;
            return source;
        }

        function genStructureManagement(item = {}) {
            let source = '';
            if (!item.submissive || item.submissive.length === 0) return source;
            for (let i in item.submissive) source += genManager(item.submissive[i]);
            return source;
        }

        function genManager(manager = {}) {
            source = '';
            source += `<div class="manager-item">`;
            if (manager.image) source += `<div class="image"><img src="${manager.image}"></div>`;
            else source += `<div class="image"><img src="http://ponomarevlad.ru/assets/img/pic.jpeg"></div>`;
            source += `<div class="info-section">`;
            if (manager.roleTitle) source += `<div class="title">${manager.roleTitle}</div>`;
            if (manager.name) source += `<div class="sub-title">${manager.name}</div>`;
            source += genProfileContacts(manager) + `</div></div>`;
            if (manager.partners && manager.partners.length > 0) {
                for (let i in manager.partners) source += genManager(manager.partners[i]);
            }
            return source;
        }

        function genProfileContacts(item = {}) {
            let source = '';
            if (item.phoneWork) source += `<div class="info-line"><strong>Рабочий телефон:</strong>${item.phoneWork}</div>`;
            if (item.phone) source += `<div class="info-line"><strong>Телефон:</strong>${item.phone}</div>`;
            if (item.email) source += `<div class="info-line"><strong>Email:</strong>${item.email}</div>`;
            return source;
        }

        function genDepartamentStructure(item = {}) {
            let source = '';
            for (let i in item.submissive) {
                let structureItem = item.submissive[i];
                if (!structureItem) continue;
                source += `<div class="structure-item"><h3>${structureItem.name}</h3>`;
                if (structureItem.submissive && structureItem.submissive[0]) {
                    let structureManager = structureItem.submissive[0];
                    source += `<div class="info"><hr><div class="role">${structureManager.roleTitle}</div>
                    <div class="name">${structureManager.name}</div></div>`;
                }
                source += `</div>`;
            }
            return source;
        }

        function genDivisionStructure(item = {}) {
            let source = '';
            if (item.submissive && item.submissive.length > 0) {
                source += '<div class="structure-header"><div>ФИО</div><div>Рабочий телефон</div><div>Телефон</div><div>Email</div></div>';
                for (let i in item.submissive) {
                    let positionItem = item.submissive[i];
                    if (!positionItem) continue;
                    source += `<div class="division-position">`;
                    source += `<div>${positionItem.name ? positionItem.name : ''}<br><span>${positionItem.roleTitle}</span></div>`;
                    source += `<div>${positionItem.phoneWork ? positionItem.phoneWork : ''}</div>`;
                    source += `<div>${positionItem.phone ? positionItem.phone : ''}</div>`;
                    source += `<div>${positionItem.email ? positionItem.email : ''}</div>`;
                    source += `</div>`;
                }
            }
            return source;
        }

        return source;
    }
}
