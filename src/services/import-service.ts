import DB, { Entities } from "../database";
import { parseMultipleFiles, ParseResult } from "../utils/import-utils";

export class ImportService {
  /**
   * Process selected files and return parse results
   */
  static async processFiles(
    files: File[],
    isFromFolder: boolean = false
  ): Promise<ParseResult[]> {
    return await parseMultipleFiles(files, isFromFolder);
  }

  /**
   * Import a single contract to the database
   */
  static async importContract(
    contract: Entities.Contract,
    currentNetwork?: string
  ): Promise<void> {
    if (!contract.address) {
      console.error("Contract missing address:", contract);
      return;
    }

    // Ensure contract has network association
    const contractWithNetwork = {
      ...contract,
      network: contract.network || currentNetwork,
    };

    // Check if contract already exists
    const existing = await DB.contracts
      .filter(
        (c) =>
          !!(
            c.address &&
            contractWithNetwork.address &&
            c.address.toLowerCase() ===
              contractWithNetwork.address.toLowerCase()
          )
      )
      .first();

    if (existing) {
      // Update existing contract
      await DB.contracts.update(existing.id!, {
        name: contractWithNetwork.name,
        abi: contractWithNetwork.abi,
        category: contractWithNetwork.category,
        network: contractWithNetwork.network,
      });
    } else {
      // Add new contract
      await DB.contracts.add({
        ...contractWithNetwork,
        createdTime: Date.now(),
      });
    }
  }

  /**
   * Import multiple contracts
   */
  static async importContracts(
    contracts: Entities.Contract[],
    currentNetwork?: string
  ): Promise<number> {
    let importedCount = 0;

    for (const contract of contracts) {
      try {
        await this.importContract(contract, currentNetwork);
        importedCount++;
      } catch (error) {
        console.error("Failed to import contract:", contract.name, error);
      }
    }

    return importedCount;
  }

  /**
   * Export contract to JSON file
   */
  static exportContractToJson(contract: Entities.Contract): void {
    const fileSaver = require("file-saver-es");
    const blob = new Blob(
      [
        JSON.stringify(
          {
            name: contract.name,
            abi: contract.abi,
            address: contract.address,
            category: contract.category,
            network: contract.network,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const filename = `${contract.name || contract.address}.json`;
    fileSaver.saveAs(blob, filename);
  }
}
