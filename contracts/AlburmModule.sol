// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

struct Alburm {
    //Name of Alburm
    string name;
    //Description of Alburm
    string description;
    //Alburm cover image url, ipfs or http
    string imageUrl;
    //Owner or Creator of Alburm
    address creator;
    //List of music post ids in this alburm
    uint256[] posts;
    //Owner's profileId
    uint256 profileId;
    //Licence of Alburm
    string licence;
}

contract AlburmModule {
    mapping(address => mapping(uint256 => Alburm)) public alburms;

    uint256 private alburmIds;

    constructor() {}

    function createAlburm(
        string calldata name,
        string calldata description,
        string calldata url,
        uint256 profileId,
        string calldata licence,
        uint256[] calldata postIds
    ) external {
        uint256 newAlburmId = alburmIds++;
        alburms[msg.sender][newAlburmId] = Alburm(
            name,
            description,
            url,
            msg.sender,
            postIds,
            profileId,
            licence
        );
    }
}
